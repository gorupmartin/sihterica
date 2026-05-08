const express = require('express');
const { queryAll } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/workers — only locked days
router.get('/workers', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  // Only count hours where a day_lock exists for that worker+date
  const results = queryAll(`
    SELECT 
      w.id, w.name, w.surname, w.active,
      COALESCE(SUM(CASE WHEN wl.status = 'RAD' THEN wl.hours ELSE 0 END), 0) as rad_hours,
      COALESCE(SUM(CASE WHEN wl.status = 'GO' THEN wl.hours ELSE 0 END), 0) as go_hours,
      COALESCE(SUM(CASE WHEN wl.status = 'BO' THEN wl.hours ELSE 0 END), 0) as bo_hours,
      COALESCE(SUM(CASE WHEN wl.status = 'SLO' THEN wl.hours ELSE 0 END), 0) as slo_hours,
      COALESCE(SUM(wl.hours), 0) as total_hours,
      COUNT(DISTINCT CASE WHEN wl.status = 'RAD' THEN wl.date END) as rad_days,
      COUNT(DISTINCT CASE WHEN wl.status = 'GO' THEN wl.date END) as go_days,
      COUNT(DISTINCT CASE WHEN wl.status = 'BO' THEN wl.date END) as bo_days,
      COUNT(DISTINCT CASE WHEN wl.status = 'SLO' THEN wl.date END) as slo_days
    FROM workers w
    LEFT JOIN work_logs wl ON w.id = wl.worker_id AND wl.date LIKE ?
    LEFT JOIN day_locks dl ON wl.worker_id = dl.worker_id AND wl.date = dl.date
    WHERE (w.active = 1 OR wl.id IS NOT NULL) AND (wl.id IS NULL OR dl.id IS NOT NULL)
    GROUP BY w.id
    ORDER BY w.surname, w.name
  `, [datePrefix]);

  res.json(results);
});

// GET /api/reports/workers/:id/locations — hours by location for a specific worker (locked days only)
router.get('/workers/:id/locations', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  const workerId = req.params.id;
  if (!month || !year) {
    return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  const results = queryAll(`
    SELECT 
      l.id as location_id, l.name as location_name,
      COALESCE(SUM(wl.hours), 0) as total_hours
    FROM work_logs wl
    INNER JOIN day_locks dl ON wl.worker_id = dl.worker_id AND wl.date = dl.date
    LEFT JOIN locations l ON wl.location_id = l.id
    WHERE wl.worker_id = ? AND wl.date LIKE ? AND wl.status = 'RAD'
    GROUP BY wl.location_id
    HAVING total_hours > 0
    ORDER BY l.name
  `, [workerId, datePrefix]);

  res.json(results);
});

// GET /api/reports/locations — locked work hours + non-blocked machine hours
router.get('/locations', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  // Human hours: only locked days
  const humanHours = queryAll(`
    SELECT 
      l.id, l.name,
      COALESCE(SUM(wl.hours), 0) as human_hours,
      COUNT(DISTINCT wl.worker_id) as worker_count
    FROM locations l
    LEFT JOIN work_logs wl ON l.id = wl.location_id AND wl.date LIKE ? AND wl.status = 'RAD'
    LEFT JOIN day_locks dl ON wl.worker_id = dl.worker_id AND wl.date = dl.date
    WHERE l.active = 1 AND (wl.id IS NULL OR dl.id IS NOT NULL)
    GROUP BY l.id
    ORDER BY l.name
  `, [datePrefix]);

  // Machine hours: only non-blocked
  const machineHours = queryAll(`
    SELECT 
      location_id,
      COALESCE(SUM(hours), 0) as machine_hours,
      COUNT(DISTINCT machine_id) as machine_count
    FROM machine_logs
    WHERE date LIKE ? AND blocked = 0
    GROUP BY location_id
  `, [datePrefix]);

  const machineMap = {};
  for (const mh of machineHours) {
    machineMap[mh.location_id] = mh;
  }

  const results = humanHours.map(loc => ({
    ...loc,
    machine_hours: machineMap[loc.id]?.machine_hours || 0,
    machine_count: machineMap[loc.id]?.machine_count || 0
  }));

  res.json(results);
});

// GET /api/reports/machines — non-blocked entries only
router.get('/machines', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  const results = queryAll(`
    SELECT 
      m.id as machine_id, m.name as machine_name,
      l.id as location_id, l.name as location_name,
      COALESCE(SUM(ml.hours), 0) as total_hours,
      COUNT(ml.id) as entry_count
    FROM machines m
    CROSS JOIN locations l
    LEFT JOIN machine_logs ml ON m.id = ml.machine_id AND l.id = ml.location_id AND ml.date LIKE ? AND ml.blocked = 0
    WHERE m.active = 1 AND l.active = 1
    GROUP BY m.id, l.id
    HAVING total_hours > 0
    ORDER BY m.name, l.name
  `, [datePrefix]);

  const machineTotals = queryAll(`
    SELECT 
      m.id, m.name,
      COALESCE(SUM(ml.hours), 0) as total_hours,
      COUNT(ml.id) as entry_count
    FROM machines m
    LEFT JOIN machine_logs ml ON m.id = ml.machine_id AND ml.date LIKE ? AND ml.blocked = 0
    WHERE m.active = 1
    GROUP BY m.id
    ORDER BY m.name
  `, [datePrefix]);

  res.json({ details: results, totals: machineTotals });
});

// GET /api/reports/trucks — non-blocked entries only, km
router.get('/trucks', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}%`;

  const results = queryAll(`
    SELECT 
      t.id as truck_id, t.name as truck_name,
      l.id as location_id, l.name as location_name,
      COALESCE(SUM(tl.km), 0) as total_km,
      COUNT(tl.id) as entry_count
    FROM trucks t
    CROSS JOIN locations l
    LEFT JOIN truck_logs tl ON t.id = tl.truck_id AND l.id = tl.location_id AND tl.date LIKE ? AND tl.blocked = 0
    WHERE t.active = 1 AND l.active = 1
    GROUP BY t.id, l.id
    HAVING total_km > 0
    ORDER BY t.name, l.name
  `, [datePrefix]);

  const truckTotals = queryAll(`
    SELECT 
      t.id, t.name,
      COALESCE(SUM(tl.km), 0) as total_km,
      COUNT(tl.id) as entry_count
    FROM trucks t
    LEFT JOIN truck_logs tl ON t.id = tl.truck_id AND tl.date LIKE ? AND tl.blocked = 0
    WHERE t.active = 1
    GROUP BY t.id
    ORDER BY t.name
  `, [datePrefix]);

  res.json({ details: results, totals: truckTotals });
});

module.exports = router;

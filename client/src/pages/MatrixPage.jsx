import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MatrixPage() {
    const { isRacunovodstvo, isAdmin } = useAuth();
    const canUnlock = isRacunovodstvo || isAdmin;
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState([]);

    // Modal state
    const [modal, setModal] = useState(null);
    const [addForm, setAddForm] = useState({ status: 'RAD', location_id: '', hours: 8, description: '' });
    const [message, setMessage] = useState('');

    useEffect(() => { load(); loadLocations(); }, [month, year]);

    const loadLocations = async () => {
        try { setLocations(await api.getLocations()); } catch { }
    };

    const load = async () => {
        setLoading(true);
        try {
            const d = await api.getMatrix(month, year);
            setData(d);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

    const getDayOfWeek = (day) => new Date(year, month - 1, day).getDay();
    const isWeekend = (day) => { const dow = getDayOfWeek(day); return dow === 0 || dow === 6; };
    const formatDate = (day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isLocked = (workerId, day) => {
        if (!data?.locks) return false;
        return !!data.locks[`${workerId}-${formatDate(day)}`];
    };

    const openCell = async (worker, day) => {
        const date = formatDate(day);
        try {
            const res = await api.getWorkerDay(worker.id, date);
            setModal({
                workerId: worker.id,
                workerName: `${worker.name} ${worker.surname}`,
                day, date,
                logs: res.logs,
                totalHours: res.totalHours,
                locked: res.locked
            });
            setAddForm({ status: 'RAD', location_id: locations[0]?.id || '', hours: 8, description: '' });
            setMessage('');
        } catch (err) { console.error(err); }
    };

    const handleAddEntry = async () => {
        if (!modal) return;
        // Validate required location for RAD
        if (addForm.status === 'RAD' && !addForm.location_id) {
            setMessage('❌ Gradilište je obavezan podatak za RAD');
            return;
        }
        try {
            const payload = {
                worker_id: modal.workerId,
                date: modal.date,
                status: addForm.status,
                hours: addForm.status === 'RAD' ? parseFloat(addForm.hours) : undefined,
                location_id: addForm.status === 'RAD' ? addForm.location_id : undefined,
                description: addForm.description || undefined,
            };
            await api.addLog(payload);
            setMessage('✅ Unos spremljen');
            const res = await api.getWorkerDay(modal.workerId, modal.date);
            setModal(prev => ({ ...prev, logs: res.logs, totalHours: res.totalHours }));
            setAddForm(prev => ({ ...prev, description: '' }));
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const handleDeleteEntry = async (logId) => {
        try {
            await api.deleteLog(logId);
            const res = await api.getWorkerDay(modal.workerId, modal.date);
            setModal(prev => ({ ...prev, logs: res.logs, totalHours: res.totalHours }));
            setMessage('🗑️ Obrisano');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const handleLock = async () => {
        if (!modal) return;
        try {
            await api.lockDay(modal.workerId, modal.date);
            setModal(prev => ({ ...prev, locked: true }));
            setMessage('🔒 Dan zaključan');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const handleUnlock = async () => {
        if (!modal) return;
        try {
            await api.unlockDay(modal.workerId, modal.date);
            setModal(prev => ({ ...prev, locked: false }));
            setMessage('🔓 Dan otključan');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const handleLockAllDay = async (day) => {
        const date = formatDate(day);
        try {
            const res = await api.lockAllDay(date);
            setMessage(res.message);
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const getCellStyle = (workerId, day) => {
        const entries = data?.matrix?.[workerId]?.days?.[day];
        const locked = isLocked(workerId, day);
        const weekend = isWeekend(day);
        if (locked && entries?.length) return 'bg-emerald-900/60 border-emerald-500/40 text-emerald-200';
        if (entries?.length) return 'bg-amber-900/40 border-amber-500/30 text-amber-200';
        if (weekend) return 'bg-surface-900/30 border-surface-700/20 text-surface-500';
        return 'bg-surface-800/40 border-surface-700/20 text-surface-400';
    };

    const getCellContent = (workerId, day) => {
        const entries = data?.matrix?.[workerId]?.days?.[day];
        if (!entries || entries.length === 0) return '';
        const total = entries.reduce((s, e) => s + (e.hours || 0), 0);
        const statuses = [...new Set(entries.map(e => e.status))];
        return `${total}h ${statuses.join('/')}`;
    };

    const statusColors = {
        RAD: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        GO: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        BO: 'bg-red-500/20 text-red-300 border border-red-500/30',
        SLO: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Satnica</h1>
                <div className="flex items-center gap-3">
                    <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
                        className="bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i + 1}>
                                {new Date(2024, i).toLocaleString('hr', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))}
                        className="bg-surface-800 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Legend — high-contrast text for dark mode */}
            <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-900/60 border-2 border-emerald-500/60"></span>
                    <span className="text-emerald-300 font-medium">Zaključano</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-amber-900/40 border-2 border-amber-500/50"></span>
                    <span className="text-amber-300 font-medium">Nezaključano</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-surface-800/40 border-2 border-surface-600"></span>
                    <span className="text-surface-300 font-medium">Prazno</span>
                </span>
            </div>

            {message && !modal && (
                <div className="bg-surface-800 border border-surface-600 rounded-lg px-4 py-2 text-sm text-white">
                    {message}
                </div>
            )}

            {/* Matrix Table */}
            {loading ? (
                <div className="text-center py-12 text-surface-400">Učitavanje...</div>
            ) : data ? (
                <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-surface-800/80">
                                <th className="sticky left-0 z-10 bg-surface-800 px-3 py-2 text-left text-surface-300 font-semibold min-w-[140px] border-r border-surface-700/50">
                                    Radnik
                                </th>
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1;
                                    const dow = getDayOfWeek(day);
                                    const weekend = dow === 0 || dow === 6;
                                    return (
                                        <th key={day}
                                            className={`px-1 py-1 text-center min-w-[52px] cursor-pointer hover:bg-surface-700/50 ${weekend ? 'text-red-400' : 'text-surface-300'}`}
                                            onClick={() => handleLockAllDay(day)}
                                            title={`Zaključaj sve za ${day}.${month}.`}>
                                            <div className="text-[10px]">{dayNames[dow]}</div>
                                            <div>{String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {data.workers.map(worker => (
                                <tr key={worker.id} className="border-t border-surface-700/30 hover:bg-surface-800/30">
                                    <td className={`sticky left-0 z-10 bg-surface-900 px-3 py-1 font-medium border-r border-surface-700/50 ${worker.active ? 'text-white' : 'text-red-400 line-through'}`}>
                                        {worker.surname} {worker.name}
                                    </td>
                                    {[...Array(daysInMonth)].map((_, i) => {
                                        const day = i + 1;
                                        const content = getCellContent(worker.id, day);
                                        return (
                                            <td key={day}
                                                className={`px-1 py-1 text-center cursor-pointer border border-opacity-50 text-[10px] font-medium transition-colors hover:brightness-125 ${getCellStyle(worker.id, day)}`}
                                                onClick={() => openCell(worker, day)}
                                                title={`${worker.surname} ${worker.name} - ${day}.${month}.${year}`}>
                                                {content && (
                                                    <div className="leading-tight">
                                                        {isLocked(worker.id, day) && <span>🔒</span>}
                                                        {content}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {/* Cell Modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                    onClick={() => setModal(null)}>
                    <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{modal.workerName}</h2>
                                    <p className="text-surface-400 text-sm">
                                        {String(modal.day).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {modal.locked ? (
                                        <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 text-xs rounded-full font-semibold border border-emerald-500/30">🔒 Zaključano</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-amber-900/50 text-amber-300 text-xs rounded-full font-semibold border border-amber-500/30">🔓 Otvoreno</span>
                                    )}
                                    <button onClick={() => setModal(null)} className="text-surface-400 hover:text-white text-xl">✕</button>
                                </div>
                            </div>

                            {/* Existing entries */}
                            {modal.logs.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-surface-300">Unosi ({modal.totalHours}h ukupno)</h3>
                                    {modal.logs.map(log => (
                                        <div key={log.id} className="bg-surface-900/50 rounded-lg px-3 py-2 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[log.status]}`}>
                                                        {log.status}
                                                    </span>
                                                    <span className="text-white text-sm font-medium">{log.hours}h</span>
                                                    {log.location_name && (
                                                        <span className="text-surface-400 text-xs">— {log.location_name}</span>
                                                    )}
                                                </div>
                                                {!modal.locked && (
                                                    <button onClick={() => handleDeleteEntry(log.id)}
                                                        className="text-red-400 hover:text-red-300 text-xs">
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                            {log.description && (
                                                <p className="text-surface-400 text-xs italic pl-1">📝 {log.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add form — only if not locked */}
                            {!modal.locked && (
                                <div className="space-y-3 border-t border-surface-700 pt-4">
                                    <h3 className="text-sm font-semibold text-surface-300">Novi unos</h3>

                                    {/* Status */}
                                    <select value={addForm.status} onChange={e => {
                                        const s = e.target.value;
                                        setAddForm(prev => ({
                                            ...prev,
                                            status: s,
                                            hours: s === 'GO' || s === 'BO' ? 8 : s === 'SLO' ? 0 : prev.hours
                                        }));
                                    }}
                                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                                        <option value="RAD">RAD</option>
                                        <option value="GO">GO (8h)</option>
                                        <option value="BO">BO (8h)</option>
                                        <option value="SLO">SLO (0h)</option>
                                    </select>

                                    {addForm.status === 'RAD' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <select value={addForm.location_id}
                                                onChange={e => setAddForm(prev => ({ ...prev, location_id: e.target.value }))}
                                                className="bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                                                <option value="">Gradilište *</option>
                                                {locations.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                            <input type="number" min="0" max="24" step="0.5" value={addForm.hours}
                                                onChange={e => setAddForm(prev => ({ ...prev, hours: e.target.value }))}
                                                className="bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                                                placeholder="Sati" />
                                        </div>
                                    )}

                                    {/* Description field — always visible */}
                                    <textarea value={addForm.description}
                                        onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
                                        rows={2}
                                        placeholder="Opis rada (npr. Iskop temelja, 07:00-15:00)" />

                                    <button onClick={handleAddEntry}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                                        ➕ Dodaj
                                    </button>
                                </div>
                            )}

                            {/* Lock/Unlock buttons */}
                            <div className="flex gap-2 border-t border-surface-700 pt-4">
                                {!modal.locked && modal.logs.length > 0 && (
                                    <button onClick={handleLock}
                                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                                        🔒 Zaključaj dan
                                    </button>
                                )}
                                {modal.locked && canUnlock && (
                                    <button onClick={handleUnlock}
                                        className="flex-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                                        🔓 Otključaj dan
                                    </button>
                                )}
                            </div>

                            {message && (
                                <div className="text-sm text-center text-white bg-surface-900 rounded-lg p-2 border border-surface-600">
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

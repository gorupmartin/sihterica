import { useState, useEffect, Fragment } from 'react';
import api from '../api/client';
import { usePeriod } from '../context/PeriodContext';
import { exportToExcel } from '../utils/exportExcel';

const MJESEC_NAZIV = (m) => new Date(2024, m - 1).toLocaleString('hr', { month: 'long' });

function ExportButton({ onClick, disabled }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2">
            📥 Izvezi u Excel
        </button>
    );
}

export default function ReportsPage() {
    const [tab, setTab] = useState('workers');
    const { month, setMonth, year, setYear } = usePeriod();

    const tabs = [
        { id: 'workers', label: 'Radnici' },
        { id: 'locations', label: 'Gradilišta' },
        { id: 'machines', label: 'Bageri' },
        { id: 'trucks', label: 'Kamioni' },
        { id: 'financial', label: 'Financije' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Izvještaji</h1>
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

            <div className="flex gap-1 bg-surface-800/50 rounded-xl p-1">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-700/50'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-surface-500 italic">
                ℹ️ Izvještaji prikazuju samo zaključane sate i neblokirane unose bagera/kamiona
            </p>

            {tab === 'workers' && <WorkersReport month={month} year={year} />}
            {tab === 'locations' && <LocationsReport month={month} year={year} />}
            {tab === 'machines' && <MachinesReport month={month} year={year} />}
            {tab === 'trucks' && <TrucksReport month={month} year={year} />}
            {tab === 'financial' && <FinancialReport month={month} year={year} />}
        </div>
    );
}

function WorkersReport({ month, year }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedWorker, setExpandedWorker] = useState(null);
    const [locationData, setLocationData] = useState([]);
    const [locationLoading, setLocationLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        setExpandedWorker(null);
        api.getWorkerReport(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
    }, [month, year]);

    const handleWorkerClick = (worker) => {
        if (expandedWorker === worker.id) {
            setExpandedWorker(null);
            return;
        }
        setExpandedWorker(worker.id);
        setLocationLoading(true);
        setLocationData([]);
        api.getWorkerLocationBreakdown(worker.id, month, year)
            .then(setLocationData)
            .catch(console.error)
            .finally(() => setLocationLoading(false));
    };

    const handleExport = () => {
        const rows = data.map(w => ({
            'Radnik': `${w.surname} ${w.name}`,
            'RAD (h)': w.rad_hours,
            'RAD (dana)': w.rad_days,
            'GO (h)': w.go_hours,
            'BO (h)': w.bo_hours,
            'SLO (dana)': w.slo_days,
            'Ukupno (h)': w.total_hours,
        }));
        exportToExcel(rows, 'Radnici', `Izvjestaj-radnici-${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading) return <div className="text-center py-8 text-surface-400">Učitavanje...</div>;

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <ExportButton onClick={handleExport} disabled={data.length === 0} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-surface-800/80">
                        <th className="px-4 py-3 text-left text-surface-300">Radnik</th>
                        <th className="px-4 py-3 text-center text-surface-300">RAD (h)</th>
                        <th className="px-4 py-3 text-center text-surface-300">RAD (dana)</th>
                        <th className="px-4 py-3 text-center text-surface-300">GO (h)</th>
                        <th className="px-4 py-3 text-center text-surface-300">BO (h)</th>
                        <th className="px-4 py-3 text-center text-surface-300">SLO (dana)</th>
                        <th className="px-4 py-3 text-center text-surface-300 font-bold">Ukupno (h)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((w, idx) => (
                        <Fragment key={w.id}>
                            <tr
                                onClick={() => handleWorkerClick(w)}
                                className={`border-t border-surface-700/30 cursor-pointer transition-colors hover:bg-surface-700/40 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''} ${expandedWorker === w.id ? 'bg-blue-900/20' : ''}`}>
                                <td className={`px-4 py-3 font-medium ${w.active ? 'text-white' : 'text-red-400'}`}>
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`text-xs transition-transform duration-200 ${expandedWorker === w.id ? 'rotate-90' : ''}`}>▶</span>
                                        {w.surname} {w.name}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-blue-300">{w.rad_hours}</td>
                                <td className="px-4 py-3 text-center text-surface-400">{w.rad_days}</td>
                                <td className="px-4 py-3 text-center text-yellow-300">{w.go_hours}</td>
                                <td className="px-4 py-3 text-center text-red-300">{w.bo_hours}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{w.slo_days}</td>
                                <td className="px-4 py-3 text-center text-white font-bold">{w.total_hours}</td>
                            </tr>
                            {expandedWorker === w.id && (
                                <tr>
                                    <td colSpan={7} className="px-0 py-0">
                                        <div className="mx-4 my-3 rounded-lg bg-surface-800/60 border border-surface-600/50 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-surface-700/40 border-b border-surface-600/30">
                                                <span className="text-sm font-semibold text-blue-300">
                                                    📍 Sati po gradilištu — {w.surname} {w.name}
                                                </span>
                                            </div>
                                            {locationLoading ? (
                                                <div className="px-4 py-4 text-center text-surface-400 text-sm">Učitavanje...</div>
                                            ) : locationData.length === 0 ? (
                                                <div className="px-4 py-4 text-center text-surface-500 text-sm">Nema radnih sati na gradilištima</div>
                                            ) : (
                                                <div className="divide-y divide-surface-700/30">
                                                    {locationData.map((loc) => (
                                                        <div key={loc.location_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-700/20 transition-colors">
                                                            <span className="text-surface-200 text-sm">{loc.location_name || 'Nepoznato gradilište'}</span>
                                                            <span className="text-blue-300 font-semibold text-sm">{loc.total_hours}h</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center justify-between px-4 py-2.5 bg-surface-700/30">
                                                        <span className="text-white font-semibold text-sm">Ukupno RAD</span>
                                                        <span className="text-white font-bold text-sm">
                                                            {locationData.reduce((sum, loc) => sum + loc.total_hours, 0)}h
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">Nema podataka</td></tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );
}

function LocationsReport({ month, year }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.getLocationReport(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
    }, [month, year]);

    const handleExport = () => {
        const rows = data.map(l => ({
            'Gradilište': l.name,
            'Ljudski sati': l.human_hours,
            'Broj radnika': l.worker_count,
            'Sati bagera': l.machine_hours,
            'Broj bagera': l.machine_count,
        }));
        exportToExcel(rows, 'Gradilišta', `Izvjestaj-gradilista-${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading) return <div className="text-center py-8 text-surface-400">Učitavanje...</div>;

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <ExportButton onClick={handleExport} disabled={data.length === 0} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-surface-800/80">
                        <th className="px-4 py-3 text-left text-surface-300">Gradilište</th>
                        <th className="px-4 py-3 text-center text-surface-300">Ljudski sati</th>
                        <th className="px-4 py-3 text-center text-surface-300">Broj radnika</th>
                        <th className="px-4 py-3 text-center text-surface-300">Sati bagera</th>
                        <th className="px-4 py-3 text-center text-surface-300">Broj bagera</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((l, idx) => (
                        <tr key={l.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                            <td className="px-4 py-3 text-white font-medium">{l.name}</td>
                            <td className="px-4 py-3 text-center text-blue-300">{l.human_hours}</td>
                            <td className="px-4 py-3 text-center text-surface-400">{l.worker_count}</td>
                            <td className="px-4 py-3 text-center text-amber-300">{l.machine_hours}</td>
                            <td className="px-4 py-3 text-center text-surface-400">{l.machine_count}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500">Nema podataka</td></tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );
}

function MachinesReport({ month, year }) {
    const [data, setData] = useState({ details: [], totals: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.getMachineReport(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
    }, [month, year]);

    const handleExport = () => {
        const rows = data.totals.map(m => ({
            'Bager': m.name,
            'Ukupni sati': m.total_hours,
            'Broj unosa': m.entry_count,
        }));
        exportToExcel(rows, 'Bageri', `Izvjestaj-bageri-${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading) return <div className="text-center py-8 text-surface-400">Učitavanje...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <ExportButton onClick={handleExport} disabled={data.totals.length === 0} />
            </div>
            {/* Totals */}
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Bager</th>
                            <th className="px-4 py-3 text-center text-surface-300">Ukupni sati</th>
                            <th className="px-4 py-3 text-center text-surface-300">Unosa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.totals.map((m, idx) => (
                            <tr key={m.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                                <td className="px-4 py-3 text-center text-amber-300 font-bold">{m.total_hours}h</td>
                                <td className="px-4 py-3 text-center text-surface-400">{m.entry_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details */}
            {data.details.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-800/80">
                                <th className="px-4 py-3 text-left text-surface-300">Bager</th>
                                <th className="px-4 py-3 text-left text-surface-300">Gradilište</th>
                                <th className="px-4 py-3 text-center text-surface-300">Sati</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.details.map((d, idx) => (
                                <tr key={`${d.machine_id}-${d.location_id}`} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                    <td className="px-4 py-3 text-white">{d.machine_name}</td>
                                    <td className="px-4 py-3 text-surface-300">{d.location_name}</td>
                                    <td className="px-4 py-3 text-center text-amber-300">{d.total_hours}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function FinancialReport({ month, year }) {
    const [data, setData] = useState({ gablec_rate: 6.5, gablec_min_hours: 5, workers: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.getFinancialReport(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
    }, [month, year]);

    const eur = (n) => `${(Number(n) || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

    if (loading) return <div className="text-center py-8 text-surface-400">Učitavanje...</div>;

    const workers = data.workers || [];
    const grandTotal = workers.reduce((sum, w) => sum + (w.total_payout || 0), 0);

    const handleExport = () => {
        const rows = workers.map(w => ({
            'Radnik': `${w.surname} ${w.name}`,
            'Satnica (€/h)': w.hourly_rate,
            'Sati (RAD+GO)': w.paid_hours,
            'Plaća za sate (€)': w.hours_pay,
            'Dani gablec': w.gablec_days,
            'Gablec (€)': w.gablec_total,
            'Ukupno za isplatu (€)': w.total_payout,
        }));
        rows.push({
            'Radnik': 'UKUPNO',
            'Satnica (€/h)': '',
            'Sati (RAD+GO)': '',
            'Plaća za sate (€)': '',
            'Dani gablec': '',
            'Gablec (€)': '',
            'Ukupno za isplatu (€)': Math.round(grandTotal * 100) / 100,
        });
        exportToExcel(rows, 'Financije', `Izvjestaj-financije-${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-surface-500 italic">
                    💶 Gablec = {data.gablec_min_hours}h ili više rada (RAD) po danu × {eur(data.gablec_rate)} ·
                    Plaća za sate = satnica × (RAD + GO sati) · samo zaključani dani
                </p>
                <ExportButton onClick={handleExport} disabled={workers.length === 0} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Radnik</th>
                            <th className="px-4 py-3 text-center text-surface-300">Satnica</th>
                            <th className="px-4 py-3 text-center text-surface-300">Sati (RAD+GO)</th>
                            <th className="px-4 py-3 text-center text-surface-300">Plaća za sate</th>
                            <th className="px-4 py-3 text-center text-surface-300">Dani gablec</th>
                            <th className="px-4 py-3 text-center text-surface-300">Gablec</th>
                            <th className="px-4 py-3 text-center text-surface-300 font-bold">Ukupno za isplatu</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map((w, idx) => (
                            <tr key={w.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className={`px-4 py-3 font-medium ${w.active ? 'text-white' : 'text-red-400'}`}>{w.surname} {w.name}</td>
                                <td className="px-4 py-3 text-center text-surface-300">{eur(w.hourly_rate)}</td>
                                <td className="px-4 py-3 text-center text-blue-300">{w.paid_hours}h</td>
                                <td className="px-4 py-3 text-center text-surface-200">{eur(w.hours_pay)}</td>
                                <td className="px-4 py-3 text-center text-surface-400">{w.gablec_days}</td>
                                <td className="px-4 py-3 text-center text-amber-300">{eur(w.gablec_total)}</td>
                                <td className="px-4 py-3 text-center text-emerald-300 font-bold">{eur(w.total_payout)}</td>
                            </tr>
                        ))}
                        {workers.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">Nema podataka</td></tr>
                        )}
                    </tbody>
                    {workers.length > 0 && (
                        <tfoot>
                            <tr className="border-t-2 border-surface-600 bg-surface-800/60">
                                <td colSpan={6} className="px-4 py-3 text-right text-white font-semibold">Ukupno svi radnici</td>
                                <td className="px-4 py-3 text-center text-emerald-300 font-bold">{eur(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

function TrucksReport({ month, year }) {
    const [data, setData] = useState({ details: [], totals: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.getTruckReport(month, year).then(setData).catch(console.error).finally(() => setLoading(false));
    }, [month, year]);

    const handleExport = () => {
        const rows = data.totals.map(t => ({
            'Kamion': t.name,
            'Ukupni km': t.total_km,
            'Broj unosa': t.entry_count,
        }));
        exportToExcel(rows, 'Kamioni', `Izvjestaj-kamioni-${year}-${String(month).padStart(2, '0')}.xlsx`);
    };

    if (loading) return <div className="text-center py-8 text-surface-400">Učitavanje...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <ExportButton onClick={handleExport} disabled={data.totals.length === 0} />
            </div>
            {/* Totals */}
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Kamion</th>
                            <th className="px-4 py-3 text-center text-surface-300">Ukupni km</th>
                            <th className="px-4 py-3 text-center text-surface-300">Unosa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.totals.map((t, idx) => (
                            <tr key={t.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                                <td className="px-4 py-3 text-center text-purple-300 font-bold">{t.total_km} km</td>
                                <td className="px-4 py-3 text-center text-surface-400">{t.entry_count}</td>
                            </tr>
                        ))}
                        {data.totals.length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-500">Nema podataka</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details */}
            {data.details.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-800/80">
                                <th className="px-4 py-3 text-left text-surface-300">Kamion</th>
                                <th className="px-4 py-3 text-left text-surface-300">Gradilište</th>
                                <th className="px-4 py-3 text-center text-surface-300">Kilometri</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.details.map((d, idx) => (
                                <tr key={`${d.truck_id}-${d.location_id}`} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                    <td className="px-4 py-3 text-white">{d.truck_name}</td>
                                    <td className="px-4 py-3 text-surface-300">{d.location_name}</td>
                                    <td className="px-4 py-3 text-center text-purple-300">{d.total_km} km</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

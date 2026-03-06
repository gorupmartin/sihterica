import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DatePicker from '../components/DatePicker';

export default function TrucksPage() {
    const { isRacunovodstvo, isAdmin } = useAuth();
    const canBlock = isRacunovodstvo || isAdmin;
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [trucks, setTrucks] = useState([]);
    const [locations, setLocations] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ truck_id: '', location_id: '', date: '', km: 0, description: '' });
    const [message, setMessage] = useState('');

    useEffect(() => { loadData(); }, [month, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [t, l, lg] = await Promise.all([
                api.getTrucks(),
                api.getLocations(),
                api.getTruckLogs({ month, year })
            ]);
            setTrucks(t);
            setLocations(l);
            setLogs(lg);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!form.truck_id || !form.location_id || !form.date) {
            setMessage('❌ Sva polja su obavezna');
            return;
        }
        try {
            await api.addTruckLog(form);
            setMessage('✅ Unos spremljen');
            setShowAdd(false);
            setForm({ truck_id: '', location_id: '', date: '', km: 0, description: '' });
            loadData();
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    const handleToggleBlock = async (id) => {
        try {
            await api.toggleTruckLogBlock(id);
            loadData();
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    const defaultDate = `${year}-${String(month).padStart(2, '0')}-01`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Kamioni</h1>
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
                    <button onClick={() => { setShowAdd(true); setForm(f => ({ ...f, date: defaultDate })); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                        ➕ Novi unos
                    </button>
                </div>
            </div>

            {message && (
                <div className="bg-surface-800/50 border border-surface-600 rounded-lg px-4 py-2 text-sm text-surface-300">
                    {message}
                </div>
            )}

            {/* Add form modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => setShowAdd(false)}>
                    <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-white">Novi unos kamiona</h2>
                        <select value={form.truck_id} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))}
                            className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                            <option value="">Odaberi kamion...</option>
                            {trucks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                            className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm">
                            <option value="">Odaberi gradilište...</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
                        <input type="number" min="0" step="1" value={form.km}
                            onChange={e => setForm(f => ({ ...f, km: parseFloat(e.target.value) }))}
                            className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                            placeholder="Prijeđeni kilometri" />
                        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                            placeholder="Opis (opcionalno)" />
                        <div className="flex gap-2">
                            <button onClick={handleAdd}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold">
                                Spremi
                            </button>
                            <button onClick={() => setShowAdd(false)}
                                className="flex-1 bg-surface-700 hover:bg-surface-600 text-white rounded-lg py-2 text-sm">
                                Odustani
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs table */}
            {loading ? (
                <div className="text-center py-12 text-surface-400">Učitavanje...</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-800/80">
                                <th className="px-4 py-3 text-left text-surface-300 font-semibold">Datum</th>
                                <th className="px-4 py-3 text-left text-surface-300 font-semibold">Kamion</th>
                                <th className="px-4 py-3 text-left text-surface-300 font-semibold">Gradilište</th>
                                <th className="px-4 py-3 text-center text-surface-300 font-semibold">Kilometri</th>
                                <th className="px-4 py-3 text-left text-surface-300 font-semibold">Opis</th>
                                <th className="px-4 py-3 text-center text-surface-300 font-semibold">Status</th>
                                {canBlock && (
                                    <th className="px-4 py-3 text-center text-surface-300 font-semibold">Akcije</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><td colSpan={canBlock ? 7 : 6} className="px-4 py-8 text-center text-surface-500">Nema unosa</td></tr>
                            ) : logs.map((log, idx) => (
                                <tr key={log.id} className={`border-t border-surface-700/30 ${log.blocked ? 'opacity-60' : ''} ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                    <td className="px-4 py-3 text-white">{log.date.split('-').reverse().join('/')}</td>
                                    <td className={`px-4 py-3 font-medium ${log.blocked ? 'text-red-400 line-through' : 'text-white'}`}>{log.truck_name}</td>
                                    <td className="px-4 py-3 text-surface-300">{log.location_name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.blocked ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                            {log.km} km
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-surface-400 text-xs">{log.description || '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        {log.blocked ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300">Blokirano</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300">Aktivno</span>
                                        )}
                                    </td>
                                    {canBlock && (
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleToggleBlock(log.id)}
                                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${log.blocked ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-red-700 hover:bg-red-600 text-white'}`}>
                                                {log.blocked ? 'Odblokiraj' : 'Blokiraj'}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

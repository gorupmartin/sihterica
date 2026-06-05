import { useState, useEffect } from 'react';
import api from '../api/client';

export default function ManagementPage() {
    const [tab, setTab] = useState('workers');
    const tabs = [
        { id: 'workers', label: 'Radnici' },
        { id: 'locations', label: 'Gradilišta' },
        { id: 'machines', label: 'Bageri' },
        { id: 'trucks', label: 'Kamioni' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Upravljanje</h1>

            {/* Tab bar */}
            <div className="flex gap-1 bg-surface-800/50 rounded-xl p-1">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-700/50'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'workers' && <WorkersTab />}
            {tab === 'locations' && <LocationsTab />}
            {tab === 'machines' && <MachinesTab />}
            {tab === 'trucks' && <TrucksTab />}
        </div>
    );
}

// --- Workers Tab ---
function WorkersTab() {
    const [items, setItems] = useState([]);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [rate, setRate] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [message, setMessage] = useState('');
    const [rateEdits, setRateEdits] = useState({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        try { setItems(await api.getWorkers({ all: 'true' })); } catch { }
    };

    const handleAdd = async () => {
        if (!name.trim() || !surname.trim()) return;
        try {
            await api.addWorker({ name: name.trim(), surname: surname.trim(), hourly_rate: parseFloat(rate) || 0 });
            setName(''); setSurname(''); setRate(''); setShowAdd(false);
            setMessage('✅ Radnik dodan');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const toggleActive = async (item) => {
        try {
            await api.updateWorker(item.id, { active: !item.active });
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const saveRate = async (item) => {
        const raw = rateEdits[item.id];
        if (raw === undefined) return;
        const value = parseFloat(raw) || 0;
        if (value === item.hourly_rate) return;
        try {
            await api.updateWorker(item.id, { hourly_rate: value });
            setMessage('✅ Satnica spremljena');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Radnici ({items.length})</h2>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                    {showAdd ? 'Odustani' : '➕ Novi radnik'}
                </button>
            </div>

            {message && <div className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-4 py-2">{message}</div>}

            {showAdd && (
                <div className="bg-surface-800/50 border border-surface-600 rounded-xl p-4 space-y-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Ime" />
                    <input type="text" value={surname} onChange={e => setSurname(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Prezime" />
                    <input type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Satnica (€/h)" />
                    <button onClick={handleAdd}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        Spremi
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Ime</th>
                            <th className="px-4 py-3 text-left text-surface-300">Prezime</th>
                            <th className="px-4 py-3 text-center text-surface-300">Satnica (€/h)</th>
                            <th className="px-4 py-3 text-center text-surface-300">Status</th>
                            <th className="px-4 py-3 text-center text-surface-300">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white">{item.name}</td>
                                <td className="px-4 py-3 text-white">{item.surname}</td>
                                <td className="px-4 py-3 text-center">
                                    <input type="number" step="0.01" min="0"
                                        value={rateEdits[item.id] !== undefined ? rateEdits[item.id] : (item.hourly_rate ?? 0)}
                                        onChange={e => setRateEdits({ ...rateEdits, [item.id]: e.target.value })}
                                        onBlur={() => saveRate(item)}
                                        className="w-24 bg-surface-900 border border-surface-600 text-white rounded-lg px-2 py-1 text-sm text-center" />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {item.active ? 'Aktivan' : 'Blokiran'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleActive(item)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${item.active ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
                                        {item.active ? 'Blokiraj' : 'Aktiviraj'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Locations Tab ---
function LocationsTab() {
    const [items, setItems] = useState([]);
    const [name, setName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        try { setItems(await api.getLocations({ all: 'true' })); } catch { }
    };

    const handleAdd = async () => {
        if (!name.trim()) return;
        try {
            await api.addLocation({ name: name.trim() });
            setName(''); setShowAdd(false);
            setMessage('✅ Gradilište dodano');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const toggleActive = async (item) => {
        try {
            await api.updateLocation(item.id, { active: !item.active });
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Gradilišta ({items.length})</h2>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                    {showAdd ? 'Odustani' : '➕ Novo gradilište'}
                </button>
            </div>

            {message && <div className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-4 py-2">{message}</div>}

            {showAdd && (
                <div className="bg-surface-800/50 border border-surface-600 rounded-xl p-4 space-y-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Naziv gradilišta" />
                    <button onClick={handleAdd}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        Spremi
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Naziv</th>
                            <th className="px-4 py-3 text-center text-surface-300">Status</th>
                            <th className="px-4 py-3 text-center text-surface-300">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white">{item.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {item.active ? 'Aktivno' : 'Zatvoreno'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleActive(item)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${item.active ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
                                        {item.active ? 'Zatvori' : 'Otvori'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Machines Tab ---
function MachinesTab() {
    const [items, setItems] = useState([]);
    const [name, setName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        try { setItems(await api.getMachines({ all: 'true' })); } catch { }
    };

    const handleAdd = async () => {
        if (!name.trim()) return;
        try {
            await api.addMachine({ name: name.trim() });
            setName(''); setShowAdd(false);
            setMessage('✅ Bager dodan');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const toggleActive = async (item) => {
        try {
            await api.updateMachine(item.id, { active: !item.active });
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Bageri ({items.length})</h2>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                    {showAdd ? 'Odustani' : '➕ Novi bager'}
                </button>
            </div>

            {message && <div className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-4 py-2">{message}</div>}

            {showAdd && (
                <div className="bg-surface-800/50 border border-surface-600 rounded-xl p-4 space-y-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Naziv bagera" />
                    <button onClick={handleAdd}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        Spremi
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Naziv</th>
                            <th className="px-4 py-3 text-center text-surface-300">Status</th>
                            <th className="px-4 py-3 text-center text-surface-300">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white">{item.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {item.active ? 'Aktivan' : 'Neaktivan'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleActive(item)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${item.active ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
                                        {item.active ? 'Deaktiviraj' : 'Aktiviraj'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Trucks Tab ---
function TrucksTab() {
    const [items, setItems] = useState([]);
    const [name, setName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        try { setItems(await api.getTrucks({ all: 'true' })); } catch { }
    };

    const handleAdd = async () => {
        if (!name.trim()) return;
        try {
            await api.addTruck({ name: name.trim() });
            setName(''); setShowAdd(false);
            setMessage('✅ Kamion dodan');
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    const toggleActive = async (item) => {
        try {
            await api.updateTruck(item.id, { active: !item.active });
            load();
        } catch (err) { setMessage(`❌ ${err.message}`); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Kamioni ({items.length})</h2>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                    {showAdd ? 'Odustani' : '➕ Novi kamion'}
                </button>
            </div>

            {message && <div className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-4 py-2">{message}</div>}

            {showAdd && (
                <div className="bg-surface-800/50 border border-surface-600 rounded-xl p-4 space-y-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-surface-900 border border-surface-600 text-white rounded-lg px-3 py-2 text-sm"
                        placeholder="Naziv kamiona" />
                    <button onClick={handleAdd}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                        Spremi
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-800/80">
                            <th className="px-4 py-3 text-left text-surface-300">Naziv</th>
                            <th className="px-4 py-3 text-center text-surface-300">Status</th>
                            <th className="px-4 py-3 text-center text-surface-300">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} className={`border-t border-surface-700/30 ${idx % 2 === 0 ? 'bg-surface-900/30' : ''}`}>
                                <td className="px-4 py-3 text-white">{item.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {item.active ? 'Aktivan' : 'Neaktivan'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleActive(item)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${item.active ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
                                        {item.active ? 'Deaktiviraj' : 'Aktiviraj'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

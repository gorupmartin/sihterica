import { useState, useEffect } from 'react';
import api from '../api/client';

const ROLE_LABELS = {
    voditelj: 'Voditelj gradilišta',
    racunovodstvo: 'Računovodstvo',
    admin: 'Administrator'
};

const ROLE_COLORS = {
    voditelj: 'bg-blue-500/20 text-blue-300',
    racunovodstvo: 'bg-emerald-500/20 text-emerald-300',
    admin: 'bg-purple-500/20 text-purple-300'
};

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', role: 'voditelj' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadUsers(); }, []);

    async function loadUsers() {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }

    function handleNew() {
        setEditingUser(null);
        setForm({ username: '', password: '', role: 'voditelj' });
        setError('');
        setSuccess('');
        setShowForm(true);
    }

    function handleEdit(user) {
        setEditingUser(user);
        setForm({ username: user.username, password: '', role: user.role });
        setError('');
        setSuccess('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.username) {
            setError('Korisničko ime je obavezno');
            return;
        }
        if (!editingUser && !form.password) {
            setError('Lozinka je obavezna za novog korisnika');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (editingUser) {
                const updateData = { username: form.username, role: form.role };
                if (form.password) updateData.password = form.password;
                await api.updateUser(editingUser.id, updateData);
                setSuccess('Korisnik ažuriran!');
            } else {
                await api.createUser(form);
                setSuccess('Korisnik kreiran!');
            }
            await loadUsers();
            setTimeout(() => {
                setShowForm(false);
                setSuccess('');
            }, 1500);
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    }

    async function handleDelete(userId) {
        if (!confirm('Jeste li sigurni da želite obrisati ovog korisnika?')) return;
        try {
            await api.deleteUser(userId);
            await loadUsers();
        } catch (err) {
            setError(err.message);
        }
    }

    function formatDate(isoDate) {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split(/[-T]/);
        return `${d}/${m}/${y}`;
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">👤 Upravljanje korisnicima</h1>
                <button
                    onClick={handleNew}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                >
                    + Novi korisnik
                </button>
            </div>

            {/* Users table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="px-4 py-3 text-left text-gray-400">Korisničko ime</th>
                            <th className="px-4 py-3 text-left text-gray-400">Uloga</th>
                            <th className="px-4 py-3 text-left text-gray-400">Kreirano</th>
                            <th className="px-4 py-3 text-right text-gray-400">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/2">
                                <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                                        {ROLE_LABELS[u.role]}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{formatDate(u.created_at)}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleEdit(u)}
                                        className="px-2 py-1 text-xs text-primary-400 hover:text-primary-300 mr-2"
                                    >
                                        Uredi
                                    </button>
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="px-2 py-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        Obriši
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-800 w-full max-w-sm rounded-2xl border border-white/10 p-6">
                        <h3 className="text-white font-bold text-lg mb-4">
                            {editingUser ? 'Uredi korisnika' : 'Novi korisnik'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Korisničko ime</label>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">
                                    Lozinka {editingUser && <span className="text-xs">(ostavi prazno za zadržati trenutnu)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Uloga</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full bg-surface-700 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-primary-500"
                                >
                                    <option value="voditelj">Voditelj gradilišta</option>
                                    <option value="racunovodstvo">Računovodstvo</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-2">{error}</div>}
                            {success && <div className="text-emerald-400 text-sm bg-emerald-500/10 rounded-lg p-2">{success}</div>}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 bg-surface-700 text-gray-300 rounded-lg hover:bg-surface-600"
                                >
                                    Odustani
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                                >
                                    {saving ? 'Spremanje...' : editingUser ? 'Spremi' : 'Kreiraj'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

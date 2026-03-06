import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const { user, logout, isRacunovodstvo, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roleLabels = {
        voditelj: 'Voditelj',
        racunovodstvo: 'Računovodstvo',
        admin: 'Administrator'
    };

    // Build navigation based on role
    const navItems = [];

    // Satnica — everyone
    navItems.push({ path: '/satnica', label: 'Satnica', icon: '📅' });

    // Bageri — everyone
    navItems.push({ path: '/bageri', label: 'Bageri', icon: '🚜' });

    // Kamioni — everyone
    navItems.push({ path: '/kamioni', label: 'Kamioni', icon: '🚛' });

    // Izvještaji — everyone
    navItems.push({ path: '/izvjestaji', label: 'Izvještaji', icon: '📊' });

    // Upravljanje — racunovodstvo + admin
    if (isRacunovodstvo || isAdmin) {
        navItems.push({ path: '/upravljanje', label: 'Upravljanje', icon: '⚙️' });
    }

    // Admin — admin only
    if (isAdmin) {
        navItems.push({ path: '/admin', label: 'Admin', icon: '👤' });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
            {/* Top navbar */}
            <nav className="bg-surface-900/80 backdrop-blur-xl border-b border-surface-700/50 sticky top-0 z-40">
                <div className="max-w-[1600px] mx-auto px-4">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🏗️</span>
                            <span className="text-white font-bold text-lg tracking-tight">Šihterica</span>
                        </div>

                        {/* Navigation tabs */}
                        <div className="flex items-center gap-1">
                            {navItems.map(item => (
                                <Link key={item.path} to={item.path}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
                    ${location.pathname === item.path
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                            : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
                                        }`}>
                                    <span className="text-base">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-white text-sm font-medium">{user?.username}</div>
                                <div className="text-surface-400 text-xs">{roleLabels[user?.role]}</div>
                            </div>
                            <button onClick={handleLogout}
                                className="bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border border-surface-600">
                                Odjava
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-[1600px] mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}

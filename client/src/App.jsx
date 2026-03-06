import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import MatrixPage from './pages/MatrixPage';
import MachineryPage from './pages/MachineryPage';
import TrucksPage from './pages/TrucksPage';
import ReportsPage from './pages/ReportsPage';
import ManagementPage from './pages/ManagementPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? children : <Navigate to="/login" />;
}

function AccountingRoute({ children }) {
    const { user, loading, isRacunovodstvo, isAdmin } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (!isRacunovodstvo && !isAdmin) return <Navigate to="/satnica" />;
    return children;
}

function AdminRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (!isAdmin) return <Navigate to="/satnica" />;
    return children;
}

export default function App() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/satnica" /> : <LoginPage />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/satnica" element={<MatrixPage />} />
                <Route path="/bageri" element={<MachineryPage />} />
                <Route path="/kamioni" element={<TrucksPage />} />
                <Route path="/izvjestaji" element={<ReportsPage />} />
                <Route path="/upravljanje" element={<AccountingRoute><ManagementPage /></AccountingRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to={user ? '/satnica' : '/login'} />} />
        </Routes>
    );
}

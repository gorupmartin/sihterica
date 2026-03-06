import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('sihterica_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const data = await api.login(username, password);
        localStorage.setItem('sihterica_token', data.token);
        localStorage.setItem('sihterica_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem('sihterica_token');
        localStorage.removeItem('sihterica_user');
        setUser(null);
    };

    const isVoditelj = user?.role === 'voditelj';
    const isRacunovodstvo = user?.role === 'racunovodstvo';
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isVoditelj, isRacunovodstvo, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

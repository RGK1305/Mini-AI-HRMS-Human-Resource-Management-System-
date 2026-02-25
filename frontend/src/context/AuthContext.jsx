import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // sessionStorage is per-tab — supports multiple orgs logged in simultaneously
        const token = sessionStorage.getItem('rize_token');
        const savedUser = sessionStorage.getItem('rize_user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                sessionStorage.removeItem('rize_token');
                sessionStorage.removeItem('rize_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        sessionStorage.setItem('rize_token', token);
        sessionStorage.setItem('rize_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        sessionStorage.removeItem('rize_token');
        sessionStorage.removeItem('rize_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

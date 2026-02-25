import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import KanbanBoard from './pages/KanbanBoard';
import EmployeeProfile from './pages/EmployeeProfile';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
                <ProtectedRoute><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/tasks" element={
                <ProtectedRoute><KanbanBoard /></ProtectedRoute>
            } />
            <Route path="/employee/:id" element={
                <ProtectedRoute><EmployeeProfile /></ProtectedRoute>
            } />
            <Route path="/" element={
                user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            } />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <div className="min-h-screen">
                    <AppRoutes />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, KanbanSquare, User, LogOut, Zap } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/tasks', label: 'Tasks', icon: KanbanSquare },
    ];

    if (user.role === 'employee') {
        navItems.push({ path: `/employee/${user.id}`, label: 'My Profile', icon: User });
    }

    return (
        <nav className="glass sticky top-0 z-50 px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/dashboard" className="flex items-center gap-2 no-underline">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                        <Zap size={18} className="text-white" />
                    </div>
                    <span className="text-lg font-bold gradient-text">RIZE OS</span>
                </Link>

                <div className="flex items-center gap-1">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all no-underline ${location.pathname === path
                                    ? 'bg-brand-600/20 text-brand-300'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            <Icon size={16} />
                            <span className="hidden sm:inline">{label}</span>
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'Admin' : user.jobRole || user.role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
}

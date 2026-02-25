import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginOrg, loginEmployee } from '../lib/api';
import { Zap, Mail, Lock, Building2, UserCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [mode, setMode] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = mode === 'admin'
                ? await loginOrg({ email, password })
                : await loginEmployee({ email, password });

            login(res.data.token, res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-surface-900 to-surface-900" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

            <div className="glass-card p-8 w-full max-w-md relative animate-fade-in">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                        <Zap size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">RIZE OS</h1>
                        <p className="text-xs text-slate-500">Workforce Intelligence Platform</p>
                    </div>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-xl bg-surface-900/60 p-1 mb-6">
                    <button
                        onClick={() => setMode('admin')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'admin'
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <Building2 size={16} />
                        Admin
                    </button>
                    <button
                        onClick={() => setMode('employee')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'employee'
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <UserCircle size={16} />
                        Employee
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="input-field !pl-10"
                                placeholder={mode === 'admin' ? 'admin@acmetech.com' : 'alice@acmetech.com'}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="input-field !pl-10 !pr-11"
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full justify-center py-3 mt-2"
                    >
                        {loading ? <div className="spinner w-5 h-5 border-2" /> : 'Sign In'}
                    </button>
                </form>

                {mode === 'admin' && (
                    <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                                Register Organization
                            </Link>
                        </p>
                    </div>
                )}

                {/* Demo credentials hint */}
                <div className="mt-4 p-3 rounded-lg bg-brand-600/5 border border-brand-600/10">
                    <p className="text-xs text-slate-500 text-center">
                        Demo: <span className="text-slate-400">{mode === 'admin' ? 'admin@acmetech.com' : 'alice@acmetech.com'}</span> / <span className="text-slate-400">password123</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

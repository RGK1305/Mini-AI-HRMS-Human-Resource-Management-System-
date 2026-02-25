import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerOrg } from '../lib/api';
import { Zap, Building2, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
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
            const res = await registerOrg({ name, email, password });
            login(res.data.token, res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-surface-900 to-surface-900" />
            <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

            <div className="glass-card p-8 w-full max-w-md relative animate-fade-in">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 mb-6">
                    <ArrowLeft size={16} />
                    Back to login
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                        <Zap size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">Register</h1>
                        <p className="text-xs text-slate-500">Create your organization</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization Name</label>
                        <div className="relative">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="input-field !pl-10"
                                placeholder="Acme Technologies"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="input-field !pl-10"
                                placeholder="admin@yourcompany.com"
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
                                placeholder="Min. 6 characters"
                                minLength={6}
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
                        {loading ? <div className="spinner w-5 h-5 border-2" /> : 'Create Organization'}
                    </button>
                </form>
            </div>
        </div>
    );
}

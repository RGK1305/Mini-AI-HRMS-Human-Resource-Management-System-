import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatsCard from '../components/StatsCard';
import { getDashboardStats, getEmployees, getAiScore, createEmployee, deleteEmployee } from '../lib/api';
import {
    Users, CheckCircle2, Clock, ListTodo, Brain, TrendingUp,
    ChevronRight, RefreshCw, BarChart3, Sparkles, Plus, X, Eye, EyeOff,
    Mail, Lock, Briefcase, Building2, UserMinus, UserCheck, Search
} from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newEmp, setNewEmp] = useState({
        name: '', email: '', password: '', role: '', department: '',
        skills: '',
    });
    const [isCustomDept, setIsCustomDept] = useState(false);
    const STANDARD_DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Infrastructure', 'Analytics'];

    // ── Search & Filter state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const debounceRef = useRef(null);

    const handleSearchChange = useCallback((val) => {
        setSearchQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(val), 200);
    }, []);

    // Filter employees dynamically based on the search query
    const filteredEmployees = employees.filter(emp => {
        if (!debouncedQuery) return true;
        const q = debouncedQuery.toLowerCase();
        return (
            emp.name.toLowerCase().includes(q) ||
            emp.role.toLowerCase().includes(q) ||
            emp.department.toLowerCase().includes(q) ||
            emp.email.toLowerCase().includes(q)
        );
    });
    const fetchData = async () => {
        try {
            if (user.role === 'admin') {
                const [statsResult, empResult] = await Promise.allSettled([
                    getDashboardStats(),
                    getEmployees(),
                ]);
                if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
                else console.error('Stats failed:', statsResult.reason);
                if (empResult.status === 'fulfilled') setEmployees(empResult.value.data);
                else console.error('Employees failed:', empResult.reason);
            } else {
                const { getTasks, getAiScore } = await import('../lib/api');
                const [tasksRes, scoreRes] = await Promise.all([
                    getTasks(),
                    getAiScore(user.id).catch(() => ({ data: { score: 0 } })),
                ]);
                const myTasks = tasksRes.data;
                const completed = myTasks.filter(t => t.status === 'COMPLETED').length;
                const inProgress = myTasks.filter(t => t.status === 'IN_PROGRESS').length;
                setStats({
                    totalTasks: myTasks.length,
                    completedTasks: completed,
                    inProgressTasks: inProgress,
                    assignedTasks: myTasks.length - completed - inProgress,
                    avgProductivityScore: Math.round(scoreRes.data.score || 0),
                });
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const recalculateScores = async () => {
        setRefreshing(true);
        try {
            await Promise.all(employees.map(emp => getAiScore(emp.id)));
            await fetchData();
        } catch (err) {
            console.error('Score recalculation failed:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setAddError('');
        setAddLoading(true);
        try {
            await createEmployee({
                ...newEmp,
                skills: newEmp.skills ? newEmp.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
            });
            setShowAddEmployee(false);
            setNewEmp({ name: '', email: '', password: '', role: '', department: '', skills: '' });
            setShowPassword(false);
            await fetchData();
        } catch (err) {
            setAddError(err.response?.data?.error || 'Failed to create employee.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemoveEmployee = async (e, employeeId) => {
        e.stopPropagation(); // <--- Crucial: Stops the row click from navigating to the profile
        const isConfirmed = window.confirm("Are you sure you want to remove this employee?");

        if (isConfirmed) {
            try {
                await deleteEmployee(employeeId);
                // Instantly remove from UI
                setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
                // Optionally refresh stats
                fetchData();
            } catch (error) {
                console.error("Failed to remove employee", error);
                alert("Could not remove employee. Please try again.");
            }
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-exceptional';
        if (score >= 60) return 'score-strong';
        if (score >= 40) return 'score-developing';
        return 'score-needs-attention';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-emerald-500/15';
        if (score >= 60) return 'bg-blue-500/15';
        if (score >= 40) return 'bg-amber-500/15';
        return 'bg-red-500/15';
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="flex items-center justify-center min-h-[80vh]">
                    <div className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Welcome back{user.name ? `, ${user.name}` : ''}
                        </h1>
                        <p className="text-slate-400 mt-1">Here's your workforce overview</p>
                    </div>
                    {user.role === 'admin' && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAddEmployee(true)}
                                className="btn-primary"
                            >
                                <Plus size={16} />
                                Add Employee
                            </button>
                            <button
                                onClick={recalculateScores}
                                disabled={refreshing}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                {refreshing ? 'Calculating...' : 'Refresh AI Scores'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        {user.role === 'admin' ? (
                            <>
                                <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
                                    <StatsCard
                                        title="Total Employees"
                                        value={stats.totalEmployees}
                                        icon={Users}
                                        color="brand"
                                    />
                                </div>
                                <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
                                    <StatsCard
                                        title="Active Employees"
                                        value={stats.activeEmployees ?? 0}
                                        subtitle="with open tasks"
                                        icon={UserCheck}
                                        color="blue"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
                                <StatsCard
                                    title="Assigned Tasks"
                                    value={stats.assignedTasks || 0}
                                    icon={ListTodo}
                                    color="brand"
                                />
                            </div>
                        )}
                        <div className="animate-slide-up" style={{ animationDelay: '160ms' }}>
                            <StatsCard
                                title="Completed Tasks"
                                value={stats.completedTasks}
                                subtitle={`of ${stats.totalTasks} total`}
                                icon={CheckCircle2}
                                color="green"
                            />
                        </div>
                        <div className="animate-slide-up" style={{ animationDelay: '240ms' }}>
                            <StatsCard
                                title="In Progress"
                                value={stats.inProgressTasks}
                                icon={Clock}
                                color="amber"
                            />
                        </div>
                        <div className="animate-slide-up" style={{ animationDelay: '320ms' }}>
                            <StatsCard
                                title="Avg AI Score"
                                value={`${stats.avgProductivityScore}%`}
                                icon={Brain}
                                color={stats.avgProductivityScore >= 60 ? 'green' : 'amber'}
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employee Table */}
                    {user.role === 'admin' && (
                        <div className="lg:col-span-2 glass-card p-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Users size={20} className="text-brand-400" />
                                    Employees
                                </h2>

                                {/* New Search Bar */}
                                <div className="relative w-full sm:w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => handleSearchChange(e.target.value)}
                                        placeholder="Search name, role, or dept..."
                                        className="input-field !pl-9 py-1.5 text-sm w-full"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => handleSearchChange('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>AI Score</th>
                                            <th>Tasks</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Changed from employees.map to filteredEmployees.map */}
                                        {filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="cursor-pointer" onClick={() => navigate(`/employee/${emp.id}`)}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-slate-200">{emp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-slate-400">{emp.role}</td>
                                                <td className="text-slate-400">{emp.department}</td>
                                                <td>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold ${getScoreBg(emp.aiScore)} ${getScoreColor(emp.aiScore)}`}>
                                                        <Sparkles size={12} />
                                                        {emp.aiScore}%
                                                    </span>
                                                </td>
                                                <td className="text-slate-400">{emp._count?.tasks || 0}</td>
                                                <td>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button
                                                            onClick={(e) => handleRemoveEmployee(e, emp.id)}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                            title="Remove Employee"
                                                        >
                                                            <UserMinus size={16} />
                                                        </button>
                                                        <ChevronRight size={16} className="text-slate-600" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Updated Empty State message */}
                                        {filteredEmployees.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center text-slate-500 py-8">
                                                    {searchQuery ? 'No employees match your search.' : 'No employees yet. Click "Add Employee" to get started.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Department Stats */}
                    {stats && stats.departmentStats && (
                        <div className="glass-card p-6 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <BarChart3 size={20} className="text-brand-400" />
                                Departments
                            </h2>
                            <div className="space-y-4">
                                {stats.departmentStats.map((dept) => (
                                    <div key={dept.department} className="p-4 rounded-xl bg-surface-900/40 border border-slate-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-slate-200">{dept.department}</span>
                                            <span className={`text-sm font-semibold ${getScoreColor(dept.avgScore)}`}>
                                                {dept.avgScore}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                                                style={{ width: `${dept.avgScore}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1.5">{dept.employeeCount} employees</p>
                                    </div>
                                ))}
                            </div>

                            {/* Top Performers */}
                            {stats.topPerformers && stats.topPerformers.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-800/50">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-emerald-400" />
                                        Top Performers
                                    </h3>
                                    <div className="space-y-2">
                                        {stats.topPerformers.slice(0, 3).map((emp, idx) => (
                                            <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                                                onClick={() => navigate(`/employee/${emp.id}`)}
                                            >
                                                <span className="text-xs font-bold text-slate-500 w-4">#{idx + 1}</span>
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-slate-300 flex-1">{emp.name}</span>
                                                <span className={`text-sm font-semibold ${getScoreColor(emp.aiScore)}`}>{emp.aiScore}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Add Employee Modal */}
            {showAddEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-card p-6 w-full max-w-lg animate-slide-up">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Plus size={20} className="text-brand-400" />
                                Add New Employee
                            </h2>
                            <button onClick={() => { setShowAddEmployee(false); setAddError(''); }} className="p-1 text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {addError && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {addError}
                            </div>
                        )}

                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={newEmp.name}
                                    onChange={e => setNewEmp(p => ({ ...p, name: e.target.value }))}
                                    className="input-field"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                    <input
                                        type="email"
                                        value={newEmp.email}
                                        onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))}
                                        className="input-field !pl-10"
                                        placeholder="john@yourcompany.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newEmp.password}
                                        onChange={e => setNewEmp(p => ({ ...p, password: e.target.value }))}
                                        className="input-field !pl-10 !pr-11"
                                        placeholder="Min 8 chars + upper, lower, num, symbol"
                                        minLength={8}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Job Role</label>
                                    <input
                                        type="text"
                                        value={newEmp.role}
                                        onChange={e => setNewEmp(p => ({ ...p, role: e.target.value }))}
                                        className="input-field"
                                        placeholder="Frontend Developer"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                                    {!isCustomDept ? (
                                        <select
                                            value={newEmp.department}
                                            onChange={e => {
                                                if (e.target.value === 'custom') {
                                                    setIsCustomDept(true);
                                                    setNewEmp(p => ({ ...p, department: '' }));
                                                } else {
                                                    setNewEmp(p => ({ ...p, department: e.target.value }));
                                                }
                                            }}
                                            className="input-field"
                                            required
                                        >
                                            <option value="">Select department...</option>
                                            {STANDARD_DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                            <option value="custom" className="font-semibold text-brand-400">+ Add New Department...</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-2 relative">
                                            <input
                                                type="text"
                                                value={newEmp.department}
                                                onChange={e => setNewEmp(p => ({ ...p, department: e.target.value }))}
                                                className="input-field"
                                                placeholder="Enter custom department name"
                                                required
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setIsCustomDept(false); setNewEmp(p => ({ ...p, department: '' })); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Skills</label>
                                <input
                                    type="text"
                                    value={newEmp.skills}
                                    onChange={e => setNewEmp(p => ({ ...p, skills: e.target.value }))}
                                    className="input-field"
                                    placeholder="React, TypeScript, Node.js (comma-separated)"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowAddEmployee(false); setAddError(''); }} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={addLoading} className="btn-primary flex-1 justify-center">
                                    {addLoading ? <div className="spinner w-5 h-5 border-2" /> : 'Create Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

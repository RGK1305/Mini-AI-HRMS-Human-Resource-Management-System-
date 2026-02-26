import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getEmployee, getAiInsights, getPerformanceTrend } from '../lib/api';
import {
    User, Brain, Sparkles, Target, ArrowLeft, Briefcase, Building2,
    Calendar, CheckCircle2, Clock, ListTodo, AlertTriangle, TrendingUp,
    Lightbulb, RefreshCw, ExternalLink, Link as LinkIcon, Award, TrendingDown, Minus
} from 'lucide-react';

export default function EmployeeProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [insights, setInsights] = useState(null);
    const [trend, setTrend] = useState(null);
    const [loading, setLoading] = useState(true);
    const [insightLoading, setInsightLoading] = useState(false);

    useEffect(() => {
        loadEmployee();
        loadTrend();
    }, [id]);

    const loadEmployee = async () => {
        try {
            const res = await getEmployee(id);
            setEmployee(res.data);
        } catch (err) {
            console.error('Failed to load employee:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTrend = async () => {
        try {
            const res = await getPerformanceTrend(id);
            setTrend(res.data);
        } catch (err) {
            console.error('Trend fetch failed:', err);
        }
    };

    const fetchInsights = async () => {
        setInsightLoading(true);
        try {
            const res = await getAiInsights(id);
            setInsights(res.data);
            // Refresh employee to get updated score
            const empRes = await getEmployee(id);
            setEmployee(empRes.data);
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        } finally {
            setInsightLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-blue-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-red-400';
    };

    const getScoreGradient = (score) => {
        if (score >= 80) return 'from-emerald-500 to-emerald-400';
        if (score >= 60) return 'from-blue-500 to-blue-400';
        if (score >= 40) return 'from-amber-500 to-amber-400';
        return 'from-red-500 to-red-400';
    };

    const getTierLabel = (tier) => {
        const labels = {
            exceptional: '🏆 Exceptional',
            strong: '💪 Strong Performer',
            developing: '📈 Developing',
            'needs-attention': '⚠️ Needs Attention',
        };
        return labels[tier] || tier;
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

    if (!employee) {
        return (
            <>
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                    <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white">Employee Not Found</h1>
                </div>
            </>
        );
    }

    const tasks = employee.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    const skills = Array.isArray(employee.skills) ? employee.skills : [];

    return (
        <>
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="glass-card p-6 animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                                {employee.name.charAt(0)}
                            </div>
                            <h1 className="text-xl font-bold text-white">{employee.name}</h1>
                            <p className="text-sm text-brand-400 mt-1">{employee.role}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Building2 size={16} className="text-slate-500" />
                                <span className="text-slate-300">{employee.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Briefcase size={16} className="text-slate-500" />
                                <span className="text-slate-300">{employee.email}</span>
                            </div>
                            {employee.walletAddress && (
                                <div className="flex items-center gap-3 text-sm">
                                    <LinkIcon size={16} className="text-slate-500" />
                                    <span className="text-slate-400 font-mono text-xs truncate">
                                        {employee.walletAddress}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Skills */}
                        <div className="mt-6 pt-4 border-t border-slate-800/50">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <Target size={14} className="text-brand-400" />
                                Current Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-brand-600/10 text-brand-300 text-xs font-medium border border-brand-600/20">
                                        {skill}
                                    </span>
                                ))}
                                {skills.length === 0 && (
                                    <p className="text-xs text-slate-500">No skills listed</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score & Insights */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* AI Score */}
                        <div className="glass-card p-6 animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Brain size={20} className="text-brand-400" />
                                    AI Productivity Score
                                </h2>
                                <button
                                    onClick={fetchInsights}
                                    disabled={insightLoading}
                                    className="btn-secondary text-xs flex items-center gap-1.5"
                                >
                                    {insightLoading ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    {insightLoading ? 'Analyzing...' : 'Generate Insights'}
                                </button>
                            </div>

                            <div className="flex items-center gap-6">
                                {/* Score circle */}
                                <div className="relative w-28 h-28 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="10" />
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="url(#scoreGrad)"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(employee.aiScore / 100) * 314} 314`}
                                        />
                                        <defs>
                                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#818cf8" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-2xl font-bold ${getScoreColor(employee.aiScore)}`}>
                                            {employee.aiScore}%
                                        </span>
                                    </div>
                                </div>

                                {/* Breakdown */}
                                {insights?.score?.breakdown && (
                                    <div className="flex-1 space-y-3">
                                        {[
                                            { label: 'Completion Rate', value: insights.score.breakdown.completionRate, weight: '×0.5' },
                                            { label: 'Speed vs Deadline', value: insights.score.breakdown.speedScore, weight: '×0.3' },
                                            { label: 'Task Complexity', value: insights.score.breakdown.complexityScore, weight: '×0.2' },
                                        ].map(({ label, value, weight }) => (
                                            <div key={label}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-slate-400">{label} <span className="text-slate-600">{weight}</span></span>
                                                    <span className="text-slate-300 font-medium">{value}%</span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-surface-800">
                                                    <div
                                                        className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(value)} transition-all duration-700`}
                                                        style={{ width: `${value}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Insights */}
                        {insights && (
                            <div className="glass-card p-6 animate-slide-up">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                    <Lightbulb size={20} className="text-amber-400" />
                                    AI Insights
                                    {insights.insights?.source === 'mock' && (
                                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Demo Mode
                                        </span>
                                    )}
                                </h2>

                                {insights.performanceTier && (
                                    <div className="mb-4 p-3 rounded-xl bg-surface-900/40 border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Award size={16} className="text-brand-400" />
                                            <span className="text-sm font-semibold text-slate-200">
                                                {getTierLabel(insights.performanceTier)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            {insights.performanceSummary}
                                        </p>
                                    </div>
                                )}

                                {insights.suggestedSkills?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                            <TrendingUp size={14} className="text-emerald-400" />
                                            Suggested Skills to Learn
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {insights.suggestedSkills.map((skill, idx) => (
                                                <span key={idx} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20">
                                                    + {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Performance Trend Prediction */}
                        {trend && (
                            <div className="glass-card p-6 animate-fade-in">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                    {trend.trend === 'improving' ? <TrendingUp size={20} className="text-emerald-400" />
                                        : trend.trend === 'declining' ? <TrendingDown size={20} className="text-red-400" />
                                            : <Minus size={20} className="text-slate-400" />}
                                    Performance Trend
                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium border ${trend.confidence === 'insufficient_data'
                                        ? 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                                        : trend.trend === 'improving'
                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            : trend.trend === 'declining'
                                                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                                : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                                        }`}>
                                        {trend.confidence === 'insufficient_data' ? 'Collecting data'
                                            : trend.trend === 'improving' ? '📈 Improving'
                                                : trend.trend === 'declining' ? '📉 Declining'
                                                    : '➡️ Stable'}
                                    </span>
                                </h2>

                                {trend.confidence === 'insufficient_data' ? (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-900/40 border border-slate-800/50">
                                        <div className="text-2xl">🔍</div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-300">Collecting more data to predict trends.</p>
                                            <p className="text-xs text-slate-500 mt-0.5">At least 5 completed tasks across 2 months are needed to generate a reliable trend prediction.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Sparkline bar chart — labels overlaid inside bars to avoid header collision */}
                                        <div className="flex items-end gap-1.5 h-28 mb-1">
                                            {trend.monthlyData.map((m) => {
                                                // 1. Identify if this is the ongoing current month
                                                const isCurrentMonth = m.month === new Date().toISOString().slice(0, 7);

                                                const barH = Math.max(20, (m.score / 100) * 112);
                                                const baseColor = m.score >= 70 ? 'bg-emerald-500' : m.score >= 50 ? 'bg-blue-500' : 'bg-amber-500';

                                                // 2. Apply faded/dashed styling if it's the current month
                                                const barStyle = isCurrentMonth
                                                    ? `${baseColor} opacity-40 border-t-2 border-dashed border-white/50`
                                                    : baseColor;

                                                return (
                                                    <div key={m.month} className="flex flex-col items-center flex-1 min-w-0" title={isCurrentMonth ? `Current Month (In Progress): ${m.score}%` : `${m.month}: ${m.score}%`}>
                                                        <div className={`relative w-full rounded-t-sm ${barStyle} transition-all`} style={{ height: `${barH}px` }}>
                                                            <span className="absolute top-1 left-0 right-0 text-center text-[9px] font-semibold text-white/90 leading-none">
                                                                {m.score}%
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-600 truncate w-full text-center mt-1">
                                                            {m.month.slice(5)}{isCurrentMonth ? '*' : ''}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {/* Predicted next month */}
                                            {trend.predictedNextMonth !== null && (() => {
                                                const barH = Math.max(20, (trend.predictedNextMonth / 100) * 112);
                                                return (
                                                    <div className="flex flex-col items-center flex-1 min-w-0" title={`Predicted: ${trend.predictedNextMonth}%`}>
                                                        <div className="relative w-full rounded-t-sm bg-brand-500/40 border border-brand-500/50 border-dashed transition-all" style={{ height: `${barH}px` }}>
                                                            <span className="absolute top-1 left-0 right-0 text-center text-[9px] font-semibold text-brand-300 leading-none">{trend.predictedNextMonth}%</span>
                                                        </div>
                                                        <span className="text-[9px] text-brand-400 truncate w-full text-center mt-1">next ✦</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Summary row */}
                                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                                            <span>{trend.monthlyData.length} months of data · confidence: {trend.confidence}</span>
                                            {trend.predictedNextMonth !== null && (
                                                <span className="text-brand-400 font-medium">Predicted next month: {trend.predictedNextMonth}%</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Task History */}
                        <div className="glass-card p-6 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <ListTodo size={20} className="text-brand-400" />
                                Task History
                                <span className="ml-2 text-xs text-slate-500">
                                    {completedTasks.length}/{tasks.length} completed
                                </span>
                            </h2>

                            <div className="space-y-2">
                                {tasks.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">No tasks assigned yet</p>
                                )}
                                {tasks.map((task) => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'COMPLETED' ? 'bg-emerald-500' :
                                            task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(task.deadline).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-brand-400">
                                                    Complexity: {task.complexity}/5
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`badge ${task.status === 'COMPLETED' ? 'badge-completed' :
                                            task.status === 'IN_PROGRESS' ? 'badge-in-progress' : 'badge-assigned'
                                            }`}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                        {task.onChainTxHash && (
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${task.onChainTxHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-400 hover:text-emerald-300"
                                                title="View on-chain proof"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getTasks, updateTaskStatus, createTask, getEmployees, deleteTask, getAssignRecommendation, getRankEmployees } from '../lib/api';
import { connectWallet, logTaskOnChain, isWeb3Available } from '../lib/web3';
import {
    KanbanSquare, Plus, Calendar, Zap, ExternalLink, X,
    Clock, CheckCircle2, ListTodo, Loader2,
    Trash2, User, AlignLeft, Hash, ShieldCheck, ChevronRight, Copy, Check,
    Sparkles, Star, Search, SlidersHorizontal
} from 'lucide-react';
import { ethers } from 'ethers';

const COLUMNS = {
    ASSIGNED: { title: 'Assigned', icon: ListTodo, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    IN_PROGRESS: { title: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    COMPLETED: { title: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const COMPLEXITY_LABELS = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Complex'];
const COMPLEXITY_COLORS = ['', 'text-slate-400', 'text-green-400', 'text-blue-400', 'text-amber-400', 'text-red-400'];

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="ml-1.5 p-1 rounded text-slate-600 hover:text-brand-400 transition-colors flex-shrink-0"
        >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    );
}

function TaskDetailModal({ task, onClose, userRole }) {
    if (!task) return null;

    const [aiRec, setAiRec] = useState(null);
    const [aiRecLoading, setAiRecLoading] = useState(false);
    const [showRec, setShowRec] = useState(false);

    const fetchRecommendations = async () => {
        setAiRecLoading(true);
        setShowRec(true);
        try {
            const res = await getAssignRecommendation(task.id);
            setAiRec(res.data);
        } catch (err) {
            console.error('AI recommendation failed:', err);
        } finally {
            setAiRecLoading(false);
        }
    };

    const statusConfig = COLUMNS[task.status] || COLUMNS.ASSIGNED;
    const StatusIcon = statusConfig.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="glass-card w-full max-w-lg animate-slide-up flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-800/60">
                    <div className="flex-1 pr-4">
                        <h2 className="text-lg font-bold text-white leading-tight">{task.title}</h2>
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon size={12} />
                            {statusConfig.title}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body — scrollable so long descriptions don't break layout */}
                <div className="p-6 space-y-5 overflow-y-auto">


                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Deadline */}
                        <div className="bg-surface-900/40 rounded-xl p-3 border border-slate-800/50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                <Calendar size={12} /> Deadline
                            </div>
                            <p className="text-sm font-medium text-slate-200">
                                {new Date(task.deadline).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Complexity */}
                        <div className="bg-surface-900/40 rounded-xl p-3 border border-slate-800/50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                <Zap size={12} /> Complexity
                            </div>
                            <p className={`text-sm font-medium ${COMPLEXITY_COLORS[task.complexity]}`}>
                                {task.complexity}/5 — {COMPLEXITY_LABELS[task.complexity]}
                            </p>
                        </div>

                        {/* Assigned To — full width */}
                        <div className="bg-surface-900/40 rounded-xl p-3 border border-slate-800/50 col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <User size={12} /> Assigned To
                                </div>
                                {userRole === 'admin' && (
                                    <button
                                        onClick={fetchRecommendations}
                                        disabled={aiRecLoading}
                                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                                    >
                                        {aiRecLoading
                                            ? <Loader2 size={10} className="animate-spin" />
                                            : <Sparkles size={10} />}
                                        AI Recommend
                                    </button>
                                )}
                            </div>
                            {task.employee ? (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-200">{task.employee.name}</p>
                                    <span className="text-slate-600">·</span>
                                    <p className="text-xs text-slate-500">{task.employee.role}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600 italic">Unassigned</p>
                            )}
                        </div>

                    </div>

                    {/* AI Smart Assignment Panel */}
                    {showRec && (
                        <div className="bg-brand-600/5 rounded-xl p-4 border border-brand-600/20">
                            <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 uppercase tracking-wider mb-3">
                                <Sparkles size={13} /> AI Smart Assignment
                            </div>
                            {aiRecLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                                    <Loader2 size={14} className="animate-spin" /> Ranking employees…
                                </div>
                            ) : aiRec?.recommendations?.length > 0 ? (
                                <div className="space-y-2">
                                    {aiRec.recommendations.map((emp, idx) => {
                                        const scoreColor = emp.matchScore >= 75 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            : emp.matchScore >= 50 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                                        return (
                                            <div key={emp.employeeId}
                                                className={`flex items-start gap-3 p-2.5 rounded-lg bg-surface-900/40 border ${emp.isCurrentlyAssigned ? 'border-brand-500/30' : 'border-slate-800/50'}`}
                                            >
                                                <span className="text-xs font-bold text-slate-600 w-4 mt-0.5">#{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-200">{emp.name}</p>
                                                        {emp.isCurrentlyAssigned && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-brand-600/15 text-brand-300 border border-brand-600/20">current</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{emp.role} · {emp.department}</p>
                                                    <p className="text-xs text-slate-600 mt-0.5">{emp.reason}</p>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${scoreColor}`}>
                                                    {emp.matchScore}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <p className="text-xs text-slate-600 mt-1">Score = AI productivity (×0.5) + availability (×0.4) + complexity fit (×0.1)</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No employees found in your organisation.</p>
                            )}
                        </div>
                    )}

                    {/* Audit Reference — full IDs for blockchain search */}
                    <div className="bg-surface-900/40 rounded-xl p-4 border border-slate-800/50">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            <Hash size={13} /> Audit Reference
                        </div>

                        {/* Database UUID */}
                        <div className="mb-3">
                            <p className="text-xs text-slate-600 mb-1">Database UUID (original task ID)</p>
                            <div className="flex items-center gap-1">
                                <code className="text-xs font-mono text-slate-300 bg-black/30 px-2 py-1 rounded flex-1 break-all">
                                    {task.id}
                                </code>
                                <CopyButton text={task.id} />
                            </div>
                        </div>

                        {/* On-chain bytes32 hash */}
                        <div>
                            <p className="text-xs text-slate-600 mb-1">On-chain bytes32 (keccak256 of UUID — use this to search Etherscan event logs)</p>
                            <div className="flex items-center gap-1">
                                <code className="text-xs font-mono text-brand-300 bg-black/30 px-2 py-1 rounded flex-1 break-all">
                                    {ethers.keccak256(ethers.toUtf8Bytes(task.id))}
                                </code>
                                <CopyButton text={ethers.keccak256(ethers.toUtf8Bytes(task.id))} />
                            </div>
                        </div>
                    </div>

                    {/* On-chain proof */}
                    {task.onChainTxHash && (
                        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={15} className="text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                                    Blockchain Proof Verified
                                </span>
                            </div>
                            <p className="text-xs font-mono text-slate-400 truncate mb-2" title={task.onChainTxHash}>
                                TX: {task.onChainTxHash}
                            </p>
                            <a
                                href={`https://sepolia.etherscan.io/tx/${task.onChainTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                                View on Sepolia Etherscan <ExternalLink size={11} />
                            </a>
                        </div>
                    )}

                    {/* Description — bottom, scrolls freely without disrupting layout */}
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            <AlignLeft size={13} /> Description
                        </div>
                        {task.description ? (
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-surface-900/40 rounded-xl p-3 border border-slate-800/50">
                                {task.description}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-600 italic">No description provided.</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

// ─── Main Board ───────────────────────────────────────────────────────────────
export default function KanbanBoard() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loggingTx, setLoggingTx] = useState(null);
    const [txStatus, setTxStatus] = useState('');
    const [selectedTask, setSelectedTask] = useState(null); // detail modal

    const [newTask, setNewTask] = useState({
        title: '', description: '', deadline: '', complexity: 3, employeeId: '',
    });
    const [createRec, setCreateRec] = useState(null);
    const [createRecLoading, setCreateRecLoading] = useState(false);

    // ── Search & Filter state ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [filterComplexity, setFilterComplexity] = useState('all');
    const [filterEmployee, setFilterEmployee] = useState('all');
    const debounceRef = useRef(null);

    // Debounce: input feels instant; filtering fires 200 ms after the user stops typing
    const handleSearchChange = useCallback((val) => {
        setSearchQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(val), 200);
    }, []);

    const activeFilterCount = [
        debouncedQuery.trim() !== '',
        filterComplexity !== 'all',
        filterEmployee !== 'all',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearchQuery('');
        setDebouncedQuery('');
        setFilterComplexity('all');
        setFilterEmployee('all');
    };


    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [tasksRes, empRes] = await Promise.all([
                getTasks(),
                user.role === 'admin' ? getEmployees() : Promise.resolve({ data: [] }),
            ]);
            setTasks(tasksRes.data);
            setEmployees(empRes.data);
        } catch (err) {
            console.error('Failed to load tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const getColumnTasks = (status) => {
        const q = debouncedQuery.trim().toLowerCase();
        return tasks.filter(t => {
            if (t.status !== status) return false;
            if (filterComplexity !== 'all' && t.complexity !== parseInt(filterComplexity)) return false;
            if (filterEmployee !== 'all' && t.employeeId !== filterEmployee) return false;
            if (q && !t.title.toLowerCase().includes(q) &&
                !t.description?.toLowerCase().includes(q) &&
                !t.employee?.name.toLowerCase().includes(q)) return false;
            return true;
        });
    };

    const filteredTotal = Object.keys(COLUMNS).reduce((sum, s) => sum + getColumnTasks(s).length, 0);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        const taskId = result.draggableId;
        const newStatus = result.destination.droppableId;
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            if (newStatus === 'COMPLETED' && isWeb3Available()) {
                await handleWeb3Log(task, newStatus);
            } else {
                await updateTaskStatus(taskId, {
                    status: newStatus,
                    // Record real completion time so the scoring engine isn't guessing
                    completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
                });
            }
        } catch (err) {
            console.error('Status update failed:', err);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
        }
    };

    const handleWeb3Log = async (task, newStatus) => {
        setLoggingTx(task.id);
        setTxStatus('Connecting wallet...');
        try {
            await connectWallet();
            setTxStatus('Signing transaction...');
            const result = await logTaskOnChain(
                task.id,
                {
                    title: task.title,
                    completedBy: user.name || user.email,
                    completedAt: new Date().toISOString(),
                    complexity: task.complexity,
                }
            );
            setTxStatus('Saving to database...');
            await updateTaskStatus(task.id, {
                status: newStatus,
                onChainTxHash: result.txHash,
                completedAt: new Date().toISOString(), // Record real completion time
            });
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: newStatus, onChainTxHash: result.txHash } : t
            ));
            setTxStatus(`✅ Logged on-chain! TX: ${result.txHash.slice(0, 10)}...`);
            setTimeout(() => { setLoggingTx(null); setTxStatus(''); }, 3000);
        } catch (err) {
            console.error('Web3 logging failed:', err);
            setTxStatus('');
            setLoggingTx(null);
            await updateTaskStatus(task.id, {
                status: newStatus,
                completedAt: new Date().toISOString(), // Fallback: still record completion time
            });
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await createTask(newTask);
            setShowCreate(false);
            setNewTask({ title: '', description: '', deadline: '', complexity: 3, employeeId: '' });
            setCreateRec(null);
            loadData();
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    };

    const fetchCreateRec = async (complexity) => {
        setCreateRecLoading(true);
        try {
            const res = await getRankEmployees(complexity);
            setCreateRec(res.data.recommendations);
        } catch (err) {
            console.error('AI rank failed:', err);
        } finally {
            setCreateRecLoading(false);
        }
    };

    const handleDeleteTask = async (e, taskId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await deleteTask(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setSelectedTask(null);
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
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
                <div className="flex items-center justify-between mb-4 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <KanbanSquare size={24} className="text-brand-400" />
                            Task Board
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {activeFilterCount > 0
                                ? <>{filteredTotal} of {tasks.length} tasks match</>
                                : <>{tasks.length} total tasks — click any card to view details</>}
                        </p>
                    </div>
                    {user.role === 'admin' && (
                        <button onClick={() => setShowCreate(true)} className="btn-primary">
                            <Plus size={16} /> New Task
                        </button>
                    )}
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="flex flex-wrap items-center gap-2 mb-5 animate-fade-in">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Search tasks or assignee…"
                            className="input-field !pl-8 py-2 text-sm w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Complexity filter */}
                    <div className="relative">
                        <SlidersHorizontal size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                            value={filterComplexity}
                            onChange={e => setFilterComplexity(e.target.value)}
                            className="input-field !pl-8 py-2 text-sm pr-8"
                        >
                            <option value="all">All complexities</option>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>{n} — {COMPLEXITY_LABELS[n]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee filter — admin only */}
                    {user.role === 'admin' && employees.length > 0 && (
                        <div className="relative">
                            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <select
                                value={filterEmployee}
                                onChange={e => setFilterEmployee(e.target.value)}
                                className="input-field !pl-8 py-2 text-sm pr-8"
                            >
                                <option value="all">All employees</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Clear all filters */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                            <X size={12} />
                            Clear
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/30 text-[9px] font-bold">{activeFilterCount}</span>
                        </button>
                    )}
                </div>

                {/* Web3 Transaction Banner */}
                {loggingTx && (
                    <div className="mb-4 p-4 rounded-xl bg-brand-600/10 border border-brand-500/20 animate-slide-up flex items-center gap-3">
                        <Loader2 size={18} className="text-brand-400 animate-spin" />
                        <span className="text-sm text-brand-300">{txStatus}</span>
                    </div>
                )}

                {/* Kanban Board */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(COLUMNS).map(([status, config]) => {
                            const columnTasks = getColumnTasks(status);
                            const Icon = config.icon;

                            return (
                                <Droppable key={status} droppableId={status}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`kanban-column ${snapshot.isDraggingOver ? 'kanban-column-dragging-over' : ''}`}
                                        >
                                            {/* Column Header */}
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                                <div className={`p-1.5 rounded-lg ${config.bg}`}>
                                                    <Icon size={16} className={config.color} />
                                                </div>
                                                <span className="font-semibold text-slate-200">{config.title}</span>
                                                <span className="ml-auto text-xs font-medium text-slate-500 bg-surface-800 px-2 py-0.5 rounded-full">
                                                    {columnTasks.length}
                                                </span>
                                            </div>

                                            {/* Task Cards */}
                                            <div className="space-y-3">
                                                {columnTasks.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                                        <Search size={20} className="text-slate-700 mb-2" />
                                                        <p className="text-xs text-slate-600">
                                                            {activeFilterCount > 0 ? 'No tasks match your filters' : 'No tasks here'}
                                                        </p>
                                                        {activeFilterCount > 0 && (
                                                            <button onClick={clearFilters} className="text-xs text-brand-400 hover:text-brand-300 mt-1 underline underline-offset-2">
                                                                Clear filters
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {columnTasks.map((task, index) => (
                                                    <Draggable
                                                        key={task.id}
                                                        draggableId={task.id}
                                                        index={index}
                                                        isDragDisabled={user.role === 'admin' || task.status === 'COMPLETED'}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedTask(task)}
                                                                className={`glass-card p-4 cursor-pointer group hover:border-brand-500/30 transition-all ${snapshot.isDragging ? 'shadow-xl shadow-brand-500/10 rotate-2' : ''
                                                                    }`}
                                                            >
                                                                {/* Title row */}
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h3 className="font-medium text-slate-200 text-sm leading-snug flex-1">
                                                                        {task.title}
                                                                    </h3>
                                                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-brand-400 transition-colors flex-shrink-0 mt-0.5" />
                                                                </div>

                                                                {/* Description preview */}
                                                                {task.description && (
                                                                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                                                        {task.description}
                                                                    </p>
                                                                )}

                                                                {/* Meta row */}
                                                                <div className="flex items-center gap-2 flex-wrap mt-3">
                                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                        <Calendar size={11} />
                                                                        {new Date(task.deadline).toLocaleDateString()}
                                                                    </span>
                                                                    <span className={`text-xs flex items-center gap-1 ${COMPLEXITY_COLORS[task.complexity]}`}>
                                                                        <Zap size={11} />
                                                                        {task.complexity}/5
                                                                    </span>
                                                                    {task.employee && (
                                                                        <span className="text-xs text-slate-400 ml-auto">
                                                                            {task.employee.name}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* On-chain badge */}
                                                                {task.onChainTxHash && (
                                                                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                                                                        <ShieldCheck size={11} />
                                                                        On-chain verified
                                                                    </div>
                                                                )}

                                                                {/* Admin delete */}
                                                                {user.role === 'admin' && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                                                                        <button
                                                                            onClick={(e) => handleDeleteTask(e, task.id)}
                                                                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                                                                        >
                                                                            <Trash2 size={13} /> Delete
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            </div>
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </div>
                </DragDropContext>

                {/* ── Task Detail Modal ── */}
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        userRole={user.role}
                    />
                )}

                {/* ── Create Task Modal ── */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="glass-card p-6 w-full max-w-lg animate-slide-up">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white">Create New Task</h2>
                                <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-slate-300">Title</label>
                                        <span className={`text-xs ${newTask.title.length >= 72 ? 'text-amber-400' : 'text-slate-500'}`}>
                                            {newTask.title.length}/80
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={newTask.title}
                                        onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                        className="input-field"
                                        placeholder="Task title (max 80 characters)"
                                        maxLength={80}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                    <textarea
                                        value={newTask.description}
                                        onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                                        className="input-field"
                                        placeholder="What needs to be done? Be specific — employees see this."
                                        rows={4}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Deadline</label>
                                        <input
                                            type="date"
                                            value={newTask.deadline}
                                            onChange={e => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Complexity (1–5)</label>
                                        <select
                                            value={newTask.complexity}
                                            onChange={e => setNewTask(prev => ({ ...prev, complexity: parseInt(e.target.value) }))}
                                            className="input-field"
                                        >
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <option key={n} value={n}>{n} — {COMPLEXITY_LABELS[n]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-300">Assign To</label>
                                        <button
                                            type="button"
                                            onClick={() => fetchCreateRec(newTask.complexity)}
                                            disabled={createRecLoading}
                                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                                        >
                                            {createRecLoading
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <Sparkles size={11} />}
                                            AI Recommend
                                        </button>
                                    </div>

                                    {/* AI ranked list — shown before dropdown */}
                                    {createRec && createRec.length > 0 && (
                                        <div className="mb-3 p-3 rounded-xl bg-brand-600/5 border border-brand-600/20 space-y-1.5">
                                            <p className="text-xs text-brand-300 font-semibold mb-2 flex items-center gap-1.5">
                                                <Sparkles size={11} /> AI Smart Assignment — click to select
                                            </p>
                                            {createRec.slice(0, 4).map((emp, idx) => {
                                                const isSelected = newTask.employeeId === emp.employeeId;
                                                const scoreColor = emp.matchScore >= 75 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                    : emp.matchScore >= 50 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                                                return (
                                                    <button
                                                        key={emp.employeeId}
                                                        type="button"
                                                        onClick={() => setNewTask(prev => ({ ...prev, employeeId: emp.employeeId }))}
                                                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all border ${isSelected
                                                            ? 'bg-brand-600/20 border-brand-500/40'
                                                            : 'border-transparent hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <span className="text-xs text-slate-600 w-4 font-bold">#{idx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-200">{emp.name}</p>
                                                            <p className="text-xs text-slate-500">{emp.role} · {emp.reason}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreColor} flex-shrink-0`}>{emp.matchScore}%</span>
                                                        {isSelected && <Check size={14} className="text-brand-400 flex-shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Fallback dropdown */}
                                    <select
                                        value={newTask.employeeId}
                                        onChange={e => setNewTask(prev => ({ ...prev, employeeId: e.target.value }))}
                                        className="input-field"
                                        required
                                    >
                                        <option value="">Select employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary flex-1 justify-center">
                                        Create Task
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </>
    );
}

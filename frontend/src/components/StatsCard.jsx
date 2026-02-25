import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'brand' }) {
    const colorMap = {
        brand: 'from-brand-500/20 to-brand-600/10 border-brand-500/20',
        green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
        amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
        red: 'from-red-500/20 to-red-600/10 border-red-500/20',
    };

    const iconColorMap = {
        brand: 'text-brand-400',
        green: 'text-emerald-400',
        blue: 'text-blue-400',
        amber: 'text-amber-400',
        red: 'text-red-400',
    };

    return (
        <div className={`glass-card p-5 bg-gradient-to-br ${colorMap[color]}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-white/5 ${iconColorMap[color]}`}>
                    <Icon size={20} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                        {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-300">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
    );
}

import React from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import type { Complaint } from '../../services/complaintService';
import { CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';

interface StatsGridProps {
    complaints: Complaint[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ complaints }) => {
    // Calculate Stats
    const total = complaints.length;
    const submitted = complaints.filter(c => c.status === 'submitted').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress' || c.status === 'in_review').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const highPriority = complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length;

    // Prepare Chart Data (Last 24 Hours Activity)
    // We'll bucket by hour
    const now = new Date();
    const chartData = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        const hourLabel = hour.getHours() + ':00';
        const count = complaints.filter(c => {
            if (!c.createdAt) return false;
            const d = c.createdAt.toDate();
            return d.getHours() === hour.getHours() && d.getDate() === hour.getDate();
        }).length;
        return { name: hourLabel, complaints: count };
    });

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/10 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <Icon className={`w-5 h-5 ${color.replace('text-', 'text-opacity-80 ')}`} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
                {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Issues"
                    value={total}
                    icon={FileText}
                    color="text-blue-500"
                />
                <StatCard
                    title="Pending"
                    value={submitted + inProgress}
                    icon={Clock}
                    color="text-amber-500"
                    subtext="Needs Action"
                />
                <StatCard
                    title="Critical"
                    value={highPriority}
                    icon={AlertTriangle}
                    color="text-rose-500"
                    subtext="High Priority"
                />
                <StatCard
                    title="Resolved"
                    value={resolved}
                    icon={CheckCircle}
                    color="text-emerald-500"
                    subtext={`${Math.round((resolved / (total || 1)) * 100)}% Rate`}
                />
            </div>

            {/* Mini Chart */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/10 flex flex-col justify-between">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Activity (24h)</h3>
                <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area type="monotone" dataKey="complaints" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComplaints)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

import React, { useEffect, useState, useRef } from 'react';
import type { Complaint } from '../../services/complaintService';
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveFeedProps {
    complaints: Complaint[];
}

interface FeedItem {
    id: string;
    type: 'new' | 'resolved' | 'escalated' | 'high_priority';
    message: string;
    timestamp: Date;
    complaintId: string;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ complaints }) => {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const prevComplaintsRef = useRef<Complaint[]>([]);

    useEffect(() => {
        const prev = prevComplaintsRef.current;
        if (prev.length === 0 && complaints.length > 0) {
            // Initial load - just show latest 3
            const initialItems = complaints.slice(0, 3).map(c => ({
                id: Math.random().toString(36),
                type: 'new' as const,
                message: `New complaint: ${c.title.substring(0, 30)}...`,
                timestamp: c.createdAt?.toDate() || new Date(),
                complaintId: c.id || ''
            }));
            setFeed(initialItems);
            prevComplaintsRef.current = complaints;
            return;
        }

        const newItems: FeedItem[] = [];

        // Check for new complaints
        const newComplaints = complaints.filter(c => !prev.find(p => p.id === c.id));
        newComplaints.forEach(c => {
            newItems.push({
                id: Math.random().toString(36),
                type: 'new',
                message: `New Report: ${c.title}`,
                timestamp: new Date(),
                complaintId: c.id || ''
            });
        });

        // Check for status changes
        complaints.forEach(c => {
            const old = prev.find(p => p.id === c.id);
            if (old && old.status !== c.status) {
                if (c.status === 'resolved') {
                    newItems.push({
                        id: Math.random().toString(36),
                        type: 'resolved',
                        message: `Resolved: ${c.id?.substring(0, 8) || c.title}`,
                        timestamp: new Date(),
                        complaintId: c.id || ''
                    });
                }
            }
        });

        if (newItems.length > 0) {
            setFeed(prevFeed => [...newItems, ...prevFeed].slice(0, 10));
        }

        prevComplaintsRef.current = complaints;
    }, [complaints]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'new': return <Bell className="w-4 h-4 text-blue-400" />;
            case 'resolved': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'escalated': return <AlertCircle className="w-4 h-4 text-rose-400" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live City Feed
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[400px]">
                {feed.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors animate-in slide-in-from-left duration-300">
                        <div className="mt-1">{getIcon(item.type)}</div>
                        <div>
                            <p className="text-sm text-slate-200 font-medium">{item.message}</p>
                            <p className="text-xs text-slate-500">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</p>
                        </div>
                    </div>
                ))}
                {feed.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">Waiting for updates...</div>
                )}
            </div>
        </div>
    );
};

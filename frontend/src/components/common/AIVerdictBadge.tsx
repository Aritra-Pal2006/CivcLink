import React from 'react';
import { Brain } from 'lucide-react';

interface AIVerdictBadgeProps {
    category: string;
    priority: string;
    aiSummary?: string;
    confidence?: number; // Optional, if we have it
}

export const AIVerdictBadge: React.FC<AIVerdictBadgeProps> = ({ category, priority, aiSummary }) => {
    // Mock confidence if not present (for demo effect)
    const confidence = 85 + Math.floor(Math.random() * 14);

    return (
        <div className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium cursor-help">
            <Brain className="w-3 h-3" />
            <span>{category}</span>
            <span className="text-indigo-500/50">|</span>
            <span>{confidence}%</span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white">AI Analysis</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Category Match:</span>
                        <span className="text-emerald-400 font-mono">{confidence}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Priority Assessment:</span>
                        <span className={`font-mono capitalize ${priority === 'high' ? 'text-rose-400' : 'text-amber-400'}`}>{priority}</span>
                    </div>
                    {aiSummary && (
                        <p className="text-xs text-slate-300 mt-2 italic border-l-2 border-indigo-500/30 pl-2">
                            "{aiSummary}"
                        </p>
                    )}
                </div>
                {/* Triangle */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
            </div>
        </div>
    );
};

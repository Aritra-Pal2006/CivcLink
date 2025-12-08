import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface TimelineEvent {
    id: string;
    status: string;
    date: Date;
    description?: string;
}

interface TimelineProps {
    events: TimelineEvent[];
    currentStatus: string;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'submitted': return Circle;
        case 'in_review': return Clock;
        case 'in_progress': return AlertCircle;
        case 'resolved': return CheckCircle;
        case 'rejected': return XCircle;
        default: return Circle;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'submitted': return 'text-gray-500 bg-gray-100';
        case 'in_review': return 'text-blue-500 bg-blue-100';
        case 'in_progress': return 'text-yellow-500 bg-yellow-100';
        case 'resolved': return 'text-green-500 bg-green-100';
        case 'rejected': return 'text-red-500 bg-red-100';
        default: return 'text-gray-500 bg-gray-100';
    }
};

export const Timeline: React.FC<TimelineProps> = ({ events, currentStatus }) => {
    // Sort events by date descending
    const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Use currentStatus to maybe highlight or just acknowledge it's passed
    console.log("Current Status:", currentStatus);

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {sortedEvents.map((event, eventIdx) => {
                    const Icon = getStatusIcon(event.status);
                    const colorClass = getStatusColor(event.status);

                    return (
                        <li key={event.id}>
                            <div className="relative pb-8">
                                {eventIdx !== sortedEvents.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className={clsx("h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white", colorClass)}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Status updated to <span className="font-medium text-gray-900 capitalize">{event.status.replace('_', ' ')}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                            <time dateTime={event.date.toISOString()}>{format(event.date, 'MMM d, p')}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

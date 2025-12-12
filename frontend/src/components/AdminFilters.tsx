import React from 'react';

interface Filters {
    status: string;
    priority: string;
    ward?: string;
}

interface AdminFiltersProps {
    filters: Filters;
    onFilterChange: (newFilters: Filters) => void;
}

const AdminFilters: React.FC<AdminFiltersProps> = ({ filters, onFilterChange }) => {
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, status: e.target.value });
    };

    const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, priority: e.target.value });
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/\s+/g, '_');
        // If user types just a number, prepend WARD_
        // But for filter input, maybe just let them type? 
        // Let's normalize to WARD_XX if they type a number, or just pass what they type if it's partial?
        // Actually, for better UX, let's just let them type the number and we prepend WARD_ on blur or just handle it.
        // Let's just pass the raw value for now, but maybe hint "WARD_12".
        // Or better: Input "12" -> "WARD_12"
        onFilterChange({ ...filters, ward: val });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={handleStatusChange}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending_verification">Pending Verification</option>
                        <option value="resolved">Resolved</option>
                        <option value="reopened">Reopened</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1">Priority</label>
                    <select
                        value={filters.priority}
                        onChange={handlePriorityChange}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1">Ward Number</label>
                    <input
                        type="text"
                        placeholder="e.g. WARD_12"
                        value={filters.ward || ''}
                        onChange={handleWardChange}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => onFilterChange({ ...filters, status: 'reopened' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.status === 'reopened'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Reopened
                </button>
                <button
                    onClick={() => onFilterChange({ ...filters, priority: 'high' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.priority === 'high'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    High Priority
                </button>

                {(filters.status || filters.priority || filters.ward) && (
                    <button
                        onClick={() => onFilterChange({ status: '', priority: '', ward: '' })}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        Clear Filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdminFilters;

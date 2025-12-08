import React from 'react';

interface Filters {
    status: string;
    priority: string;
    state?: string;
    district?: string;
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

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, state: e.target.value, district: '' }); // Reset district when state changes
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, district: e.target.value });
    };

    // Full list of Indian States and UTs
    const states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
        "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

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
                    <label className="text-xs font-semibold text-gray-500 mb-1">State</label>
                    <select
                        value={filters.state || ''}
                        onChange={handleStateChange}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                    >
                        <option value="">All States</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-1">District</label>
                    <input
                        type="text"
                        placeholder="District Name"
                        value={filters.district || ''}
                        onChange={handleDistrictChange}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => onFilterChange({ ...filters, status: 'pending_verification' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.status === 'pending_verification'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Pending Verification
                </button>
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

                {(filters.status || filters.priority || filters.state || filters.district) && (
                    <button
                        onClick={() => onFilterChange({ status: '', priority: '', state: '', district: '' })}
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

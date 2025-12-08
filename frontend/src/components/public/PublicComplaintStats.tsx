import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PublicComplaintStatsProps {
    stats: any;
    categoryData: { name: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const PublicComplaintStats: React.FC<PublicComplaintStatsProps> = ({ stats, categoryData }) => {
    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Today</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.total_complaints_today || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.complaints_solved || 0}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Issues by Category</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="count"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {categoryData.slice(0, 4).map((entry, index) => (
                        <div key={entry.name} className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="truncate">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

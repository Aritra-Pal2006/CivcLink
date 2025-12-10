import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    department?: string;
    adminArea?: any;
}

export const ManageOfficialsPage: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'ward_admin',
        department: '',
        wardCode: '',
        city: userProfile?.adminArea?.city || ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = await currentUser?.getIdToken();
            const response = await fetch('http://localhost:5000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = await currentUser?.getIdToken();
            const payload = {
                email: formData.email,
                password: formData.password,
                displayName: formData.displayName,
                role: formData.role,
                department: formData.department || null,
                adminArea: {
                    city: formData.city,
                    wardCode: formData.wardCode || null
                }
            };

            const response = await fetch('http://localhost:5000/api/admin/users/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowInviteForm(false);
                fetchUsers();
                setFormData({ ...formData, email: '', password: '', displayName: '' });
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error("Error inviting user:", error);
            alert("Failed to invite user");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading officials...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Manage Officials</h1>
                <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {showInviteForm ? 'Cancel' : 'Add New Official'}
                </button>
            </div>

            {showInviteForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Create New Official</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text" placeholder="Display Name" required
                            className="border p-2 rounded"
                            value={formData.displayName}
                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        />
                        <input
                            type="email" placeholder="Email" required
                            className="border p-2 rounded"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                            type="password" placeholder="Password" required
                            className="border p-2 rounded"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <select
                            className="border p-2 rounded"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="ward_admin">Ward Admin</option>
                            <option value="dept_admin">Dept Admin</option>
                            {userProfile?.role === 'superadmin' && (
                                <option value="city_admin">City Admin</option>
                            )}
                        </select>

                        {formData.role === 'dept_admin' && (
                            <select
                                className="border p-2 rounded"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                            >
                                <option value="">Select Department</option>
                                <option value="Roads">Roads</option>
                                <option value="Water">Water</option>
                                <option value="Waste">Waste</option>
                                <option value="Electricity">Electricity</option>
                            </select>
                        )}

                        {/* City Input: Editable for Super Admin, Read-only for City Admin */}
                        {(userProfile?.role === 'superadmin' || userProfile?.role === 'city_admin') && (
                            <input
                                type="text"
                                placeholder="City"
                                className={`border p-2 rounded ${userProfile?.role === 'city_admin' ? 'bg-gray-100' : ''}`}
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                disabled={userProfile?.role === 'city_admin'}
                                required
                            />
                        )}

                        {formData.role === 'ward_admin' && (
                            <input
                                type="text" placeholder="Ward Code (e.g. W01)"
                                className="border p-2 rounded"
                                value={formData.wardCode}
                                onChange={e => setFormData({ ...formData, wardCode: e.target.value })}
                            />
                        )}

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center justify-center ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </>
                                ) : 'Create Official'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Assignment</th>
                            <th className="p-4">Email</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.uid} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{user.displayName}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                        ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'city_admin' ? 'bg-indigo-100 text-indigo-800' :
                                                user.role === 'dept_admin' ? 'bg-blue-100 text-blue-800' :
                                                    user.role === 'ward_admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                    {user.department && `Dept: ${user.department}`}
                                    {user.adminArea?.wardCode && `Ward: ${user.adminArea.wardCode}`}
                                    {user.adminArea?.city && `City: ${user.adminArea.city}`}
                                </td>
                                <td className="p-4 text-sm text-gray-500">{user.email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

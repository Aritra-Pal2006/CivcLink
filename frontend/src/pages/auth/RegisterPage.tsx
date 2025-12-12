import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, ArrowRight, UserPlus, MapPin } from 'lucide-react';

const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["citizen", "ward_admin", "city_admin"] as const),
    wardNumber: z.string().optional(),
    city: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine((data) => {
    if (data.role === 'ward_admin') {
        return !!data.wardNumber;
    }
    if (data.role === 'city_admin') {
        return !!data.city;
    }
    return true;
}, {
    message: "Required field missing",
    path: ["wardNumber"], // This path might need to be dynamic or generic error
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const CITIES = ["Delhi", "Mumbai", "Kolkata", "Bangalore", "Chennai", "Hyderabad", "Pune"];

export const RegisterPage: React.FC = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormInputs>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: "citizen"
        }
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const selectedRole = watch("role");

    const onSubmit = async (data: RegisterFormInputs) => {
        setLoading(true);
        setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: data.name
            });

            let userData: any = {
                uid: user.uid,
                email: data.email,
                displayName: data.name,
                role: data.role === 'citizen' ? 'citizen' : 'admin',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (data.role === 'city_admin') {
                userData.adminLevel = 'city';
                userData.department = 'City Administration';
                userData.assignedCity = data.city;
            } else if (data.role === 'ward_admin') {
                userData.adminLevel = 'ward';
                userData.assignedWard = `WARD_${data.wardNumber}`; // Standardize format
                userData.department = 'Ward Administration';
            }

            await setDoc(doc(db, "users", user.uid), userData);

            if (data.role !== 'citizen') {
                navigate('/admin/analytics');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || "Failed to register");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
            {/* Background Image & Gradient Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=2070&auto=format&fit=crop"
                    alt="Mumbai Sea Link"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-chakra-dark/90 via-chakra/80 to-primary-900/80 mix-blend-multiply"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-8 py-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-inner border border-white/10">
                                <UserPlus className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                                Join CivicLink
                            </h2>
                            <p className="text-primary-100 text-sm mt-2">
                                Create an account to start reporting issues.
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-start backdrop-blur-sm">
                                    <AlertCircle className="h-5 w-5 text-red-200 mt-0.5 mr-2 flex-shrink-0" />
                                    <p className="text-sm text-red-100">{error}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.name ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                    placeholder="John Doe"
                                    {...register("name")}
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-300 ml-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.email ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                    placeholder="you@example.com"
                                    {...register("email")}
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-300 ml-1">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                    I am a...
                                </label>
                                <select
                                    id="role"
                                    className="block w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm appearance-none"
                                    {...register("role")}
                                >
                                    <option value="citizen" className="text-gray-900">Citizen</option>
                                    <option value="ward_admin" className="text-gray-900">Ward Admin</option>
                                    <option value="city_admin" className="text-gray-900">City Admin</option>
                                </select>
                            </div>

                            {selectedRole === 'ward_admin' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label htmlFor="wardNumber" className="block text-sm font-medium text-yellow-300 mb-1 ml-1 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" /> Ward Number
                                    </label>
                                    <input
                                        id="wardNumber"
                                        type="text"
                                        className={`block w-full px-4 py-3 rounded-xl bg-yellow-500/10 border ${errors.wardNumber ? 'border-red-400/50' : 'border-yellow-500/30'} text-white placeholder-yellow-200/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                        placeholder="e.g. 12"
                                        {...register("wardNumber")}
                                    />
                                    {errors.wardNumber && <p className="mt-1 text-xs text-red-300 ml-1">{errors.wardNumber.message}</p>}
                                </div>
                            )}

                            {selectedRole === 'city_admin' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label htmlFor="city" className="block text-sm font-medium text-purple-300 mb-1 ml-1 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" /> Assigned City
                                    </label>
                                    <select
                                        id="city"
                                        className="block w-full px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm appearance-none"
                                        {...register("city")}
                                    >
                                        <option value="" className="text-gray-500">Select City</option>
                                        {CITIES.map(city => (
                                            <option key={city} value={city} className="text-gray-900">{city}</option>
                                        ))}
                                    </select>
                                    {errors.city && <p className="mt-1 text-xs text-red-300 ml-1">{errors.city.message}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.password ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                        placeholder="••••••"
                                        {...register("password")}
                                    />
                                    {errors.password && <p className="mt-1 text-xs text-red-300 ml-1">{errors.password.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                        Confirm
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.confirmPassword ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                        placeholder="••••••"
                                        {...register("confirmPassword")}
                                    />
                                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-300 ml-1">{errors.confirmPassword.message}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Account <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-sm text-primary-100">
                                Already have an account?{' '}
                                <Link to="/login" className="font-bold text-white hover:text-primary-200 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

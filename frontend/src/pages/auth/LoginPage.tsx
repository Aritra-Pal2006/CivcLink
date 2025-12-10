import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, ArrowRight, Building2, ShieldCheck, User } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
        resolver: zodResolver(loginSchema)
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loginType, setLoginType] = useState<'citizen' | 'official'>('citizen');
    const navigate = useNavigate();

    const onSubmit = async (data: LoginFormInputs) => {
        setLoading(true);
        setError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../../lib/firebase');

            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Role Validation based on Login Type
                if (loginType === 'official') {
                    if (!['official', 'superadmin', 'city_admin', 'dept_admin', 'ward_admin'].includes(userData.role)) {
                        throw new Error("Access Denied: You are not an authorized official.");
                    }

                    // Redirect based on specific role
                    switch (userData.role) {
                        case 'ward_admin': navigate('/ward/dashboard'); break;
                        case 'dept_admin': navigate('/dept/dashboard'); break;
                        case 'city_admin': navigate('/city/dashboard'); break;
                        case 'superadmin': navigate('/super/dashboard'); break;
                        default: navigate('/admin/analytics'); // Fallback
                    }
                } else {
                    // Citizen Login
                    if (['official', 'superadmin', 'city_admin', 'dept_admin', 'ward_admin'].includes(userData.role)) {
                        // Officials can login as citizens too, but usually go to admin dashboard
                        // For now, force them to their dashboard if they log in as official, 
                        // but if they log in as citizen, maybe send them to citizen dashboard?
                        // Requirement says "Admin dashboards must NEVER be accessible to citizens".
                        // But officials might want to file complaints.
                        // Let's stick to the requested flow:
                        navigate('/citizen/dashboard');
                    } else {
                        navigate('/citizen/dashboard');
                    }
                }
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.message.includes("Access Denied")) {
                setError(err.message);
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Invalid email or password. Please try again.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Too many failed attempts. Please try again later.");
            } else {
                setError("Failed to sign in. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
            {/* Background Image & Gradient Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1532375810709-75b1da00537c?q=80&w=2070&auto=format&fit=crop"
                    alt="India Flag"
                    className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${loginType === 'official' ? 'from-slate-900/95 via-slate-800/90 to-primary-900/80' : 'from-chakra-dark/90 via-chakra/80 to-primary-900/80'} mix-blend-multiply transition-colors duration-500`}></div>
            </div>

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-8 py-10">
                        {/* Brand Header */}
                        <div className="text-center mb-8">
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${loginType === 'official' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/20 border-white/10'} backdrop-blur-md mb-4 shadow-inner border transition-colors duration-300`}>
                                {loginType === 'official' ? (
                                    <ShieldCheck className="h-8 w-8 text-yellow-400" />
                                ) : (
                                    <Building2 className="h-8 w-8 text-white" />
                                )}
                            </div>
                            <h1 className="text-4xl font-bold text-white tracking-tight mb-2 drop-shadow-md">
                                {loginType === 'official' ? 'Official Portal' : 'CivicLink'}
                            </h1>
                            <p className="text-primary-100 text-sm font-medium tracking-wide uppercase opacity-90">
                                {loginType === 'official' ? 'Restricted Access' : 'Empowering Citizens'}
                            </p>
                        </div>

                        {/* Login Type Toggle */}
                        <div className="flex bg-black/20 p-1 rounded-xl mb-8 backdrop-blur-sm border border-white/5">
                            <button
                                type="button"
                                onClick={() => setLoginType('citizen')}
                                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all duration-200 ${loginType === 'citizen' ? 'bg-white text-primary-900 shadow-md' : 'text-primary-200 hover:text-white'}`}
                            >
                                <User className="w-4 h-4 mr-2" /> Citizen
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginType('official')}
                                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all duration-200 ${loginType === 'official' ? 'bg-yellow-500 text-black shadow-md' : 'text-primary-200 hover:text-white'}`}
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" /> Official
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-start backdrop-blur-sm">
                                    <AlertCircle className="h-5 w-5 text-red-200 mt-0.5 mr-2 flex-shrink-0" />
                                    <p className="text-sm text-red-100">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.email ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 ${loginType === 'official' ? 'focus:ring-yellow-400' : 'focus:ring-primary-400'} focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                        placeholder="you@example.com"
                                        {...register("email")}
                                    />
                                    {errors.email && <p className="mt-1 text-xs text-red-300 ml-1">{errors.email.message}</p>}
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-primary-100 mb-1 ml-1">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        className={`block w-full px-4 py-3 rounded-xl bg-black/20 border ${errors.password ? 'border-red-400/50' : 'border-white/10'} text-white placeholder-primary-200/50 focus:outline-none focus:ring-2 ${loginType === 'official' ? 'focus:ring-yellow-400' : 'focus:ring-primary-400'} focus:border-transparent focus:bg-black/30 transition-all duration-200 backdrop-blur-sm`}
                                        placeholder="••••••••"
                                        {...register("password")}
                                    />
                                    {errors.password && <p className="mt-1 text-xs text-red-300 ml-1">{errors.password.message}</p>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center text-primary-100 cursor-pointer group">
                                    <input type="checkbox" className={`w-4 h-4 rounded border-white/30 ${loginType === 'official' ? 'text-yellow-500 focus:ring-yellow-400' : 'text-primary-500 focus:ring-primary-400'} bg-white/10`} />
                                    <span className="ml-2 group-hover:text-white transition-colors">Remember me</span>
                                </label>
                                <a href="#" className="text-primary-200 hover:text-white font-medium transition-colors">
                                    Forgot password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold ${loginType === 'official' ? 'text-black bg-yellow-500 hover:bg-yellow-400 focus:ring-yellow-500' : 'text-primary-900 bg-white hover:bg-primary-50 focus:ring-primary-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        {loginType === 'official' ? 'Access Portal' : 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-sm text-primary-100">
                                Don't have an account?{' '}
                                <Link to="/register" className="font-bold text-white hover:text-primary-200 transition-colors">
                                    Create one now
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-primary-200/60">
                        &copy; {new Date().getFullYear()} CivicLink. Secure Government Portal.
                    </p>
                </div>
            </div>
        </div>
    );
};

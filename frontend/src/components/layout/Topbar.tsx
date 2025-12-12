import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { userProfile, logout } = useAuth();

    return (
        <header className="bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm z-10">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <button
                            type="button"
                            className="px-4 text-primary-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
                            onClick={onMenuClick}
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex items-center">
                        <button
                            type="button"
                            className="bg-white/10 p-1 rounded-full text-primary-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                            <span className="sr-only">View notifications</span>
                            <Bell className="h-6 w-6" aria-hidden="true" />
                        </button>

                        {/* Language Toggle */}
                        <div className="ml-3">
                            <button
                                onClick={() => {
                                    const current = localStorage.getItem('app_lang') || 'en';
                                    const next = current === 'en' ? 'hi' : 'en';
                                    localStorage.setItem('app_lang', next);
                                    window.location.reload(); // Simple reload to apply (mock)
                                }}
                                className="px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/20"
                            >
                                {localStorage.getItem('app_lang') === 'hi' ? '🇮🇳 HI' : '🇺🇸 EN'}
                            </button>
                        </div>

                        {/* Profile dropdown */}
                        <div className="ml-3 relative flex items-center gap-4">
                            <div className="text-sm text-right hidden sm:block">
                                <div className="font-medium text-white drop-shadow-md">{userProfile?.displayName}</div>
                                <div className="text-primary-200 capitalize">{userProfile?.role}</div>
                            </div>
                            <div className="relative group">
                                <button className="bg-white/20 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                    <span className="sr-only">Open user menu</span>
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary-500 text-white border border-white/20">
                                        <User className="h-5 w-5" />
                                    </div>
                                </button>
                                {/* Dropdown menu */}
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white/90 backdrop-blur-xl ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block">
                                    <button
                                        onClick={logout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-primary-50"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

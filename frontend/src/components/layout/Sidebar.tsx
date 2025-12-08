import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Settings, Map, LogOut, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { userProfile, logout } = useAuth();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const navigation = [
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('community_feed'), href: '/feed', icon: Map },
        { name: 'Community Verify', href: '/community-verification', icon: Users },
        ...(userProfile?.role === 'citizen' ? [
            { name: t('new_complaint'), href: '/complaints/new', icon: PlusCircle },
            { name: t('my_complaints'), href: '/complaints', icon: FileText },
        ] : []),
        ...(userProfile?.role === 'official' || userProfile?.role === 'superadmin' ? [
            { name: 'All Complaints', href: '/admin/complaints', icon: FileText },
            { name: 'Analytics', href: '/admin/analytics', icon: Map },
        ] : []),
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-30 w-64 bg-white/10 backdrop-blur-xl border-r border-white/20 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-center h-16 bg-primary-600/90 backdrop-blur-sm border-b border-white/10">
                    <span className="text-white text-2xl font-bold tracking-wider drop-shadow-md">{t('app_title')}</span>
                </div>

                <nav className="mt-5 px-2 space-y-1 flex-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    isActive ? 'bg-primary-500/20 text-white border border-white/20' : 'text-primary-100 hover:bg-white/10 hover:text-white',
                                    'group flex items-center px-2 py-2 text-base font-medium rounded-md transition-all duration-200'
                                )}
                                onClick={() => window.innerWidth < 1024 && onClose()}
                            >
                                <item.icon
                                    className={clsx(
                                        isActive ? 'text-primary-300' : 'text-primary-200 group-hover:text-white',
                                        'mr-4 flex-shrink-0 h-6 w-6'
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 p-4 bg-black/10">
                    <div className="flex justify-around mb-4">
                        <button onClick={() => changeLanguage('en')} className={`text-xs font-bold ${i18n.language === 'en' ? 'text-primary-300' : 'text-primary-200/50 hover:text-white'}`}>EN</button>
                        <button onClick={() => changeLanguage('hi')} className={`text-xs font-bold ${i18n.language === 'hi' ? 'text-primary-300' : 'text-primary-200/50 hover:text-white'}`}>HI</button>
                        <button onClick={() => changeLanguage('es')} className={`text-xs font-bold ${i18n.language === 'es' ? 'text-primary-300' : 'text-primary-200/50 hover:text-white'}`}>ES</button>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            logout();
                        }}
                        className="flex items-center w-full px-2 py-2 text-base font-medium text-red-300 rounded-md hover:bg-red-500/20 hover:text-red-100 group transition-colors"
                    >
                        <LogOut className="mr-4 h-6 w-6" />
                        {t('sign_out')}
                    </button>
                </div>
            </div>
        </>
    );
};

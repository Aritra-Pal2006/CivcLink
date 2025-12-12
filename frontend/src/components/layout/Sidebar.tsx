import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Settings, Map, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import clsx from 'clsx';
import { LanguageSelector } from '../common/LanguageSelector';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { userProfile, logout } = useAuth();
    const location = useLocation();
    const { t } = useLanguage();

    const navigation = [
        { name: t('dashboard.title'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('community_feed'), href: '/feed', icon: Map },
        ...(userProfile?.role === 'citizen' ? [
            { name: t('newComplaint'), href: '/complaints/new', icon: PlusCircle },
            { name: t('myComplaints'), href: '/complaints', icon: FileText },
        ] : []),
        ...(userProfile?.role === 'admin' ? [
            { name: t('admin.allComplaints'), href: '/admin/complaints', icon: FileText },
            { name: t('admin.analytics'), href: '/admin/analytics', icon: Map },
            ...(userProfile.adminLevel === 'city' ? [
                { name: t('admin.escalations'), href: '/admin/escalations', icon: AlertCircle } // Need to import AlertCircle
            ] : [])
        ] : []),
        { name: t('settings'), href: '/settings', icon: Settings },
    ];



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
                <div className="flex flex-col items-center justify-center h-20 bg-primary-600/90 backdrop-blur-sm border-b border-white/10">
                    <span className="text-white text-2xl font-bold tracking-wider drop-shadow-md">{t('appTitle')}</span>
                    {userProfile?.role === 'admin' && (
                        <span className="text-xs text-primary-200 font-medium mt-1 px-2 py-0.5 rounded bg-black/20">
                            {userProfile.adminLevel === 'ward'
                                ? `Ward Admin: ${userProfile.assignedWard || 'N/A'}`
                                : 'City Admin'}
                        </span>
                    )}
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
                    <div className="flex justify-center mb-4">
                        <LanguageSelector />
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            logout();
                        }}
                        className="flex items-center w-full px-2 py-2 text-base font-medium text-red-300 rounded-md hover:bg-red-500/20 hover:text-red-100 group transition-colors"
                    >
                        <LogOut className="mr-4 h-6 w-6" />
                        {t('common.logout')}
                    </button>
                </div>
            </div>
        </>
    );
};

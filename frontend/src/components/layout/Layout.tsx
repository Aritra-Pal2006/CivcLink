import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen relative flex overflow-hidden">
            {/* Global Background */}
            <div className="fixed inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=2070&auto=format&fit=crop"
                    alt="Indian Theme Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-chakra-dark/90 via-chakra/80 to-primary-900/80 mix-blend-multiply"></div>
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 flex w-full h-full">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
                    <Topbar onMenuClick={() => setSidebarOpen(true)} />

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

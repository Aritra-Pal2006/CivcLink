import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-white/10 backdrop-blur-md border-t border-white/20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex justify-center md:justify-start space-x-6 md:order-2">
                        <Link to="#" className="text-primary-200 hover:text-white">
                            About
                        </Link>
                        <Link to="#" className="text-primary-200 hover:text-white">
                            Contact
                        </Link>
                        <Link to="#" className="text-primary-200 hover:text-white">
                            Privacy
                        </Link>
                        <Link to="/login" className="text-primary-200 hover:text-white">
                            Admin Login
                        </Link>
                    </div>
                    <div className="mt-8 md:mt-0 md:order-1">
                        <p className="text-center text-base text-primary-200">
                            &copy; {new Date().getFullYear()} CivicLink. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

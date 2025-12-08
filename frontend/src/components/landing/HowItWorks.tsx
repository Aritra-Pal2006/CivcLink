import React from 'react';

export const HowItWorks: React.FC = () => {
    return (
        <div className="bg-white/5 backdrop-blur-sm py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center mb-10">
                    <h2 className="text-base text-primary-300 font-semibold tracking-wide uppercase">Process</h2>
                    <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl drop-shadow-md">
                        How It Works
                    </p>
                </div>

                <div className="relative">
                    {/* Timeline Line */}
                    <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-white/20"></div>

                    <div className="space-y-12">
                        {/* Step 1 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white/20 bg-primary-500 shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                <span className="text-white font-bold">1</span>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/10 md:order-2">
                                <h3 className="text-lg font-bold text-white mb-2">File a Complaint</h3>
                                <p className="text-primary-100">
                                    Take a photo, add a description, and let our AI categorize it for you. It takes less than a minute.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white/20 bg-primary-500 shadow-lg shrink-0 md:order-1 md:translate-x-1/2 z-10">
                                <span className="text-white font-bold">2</span>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/10 md:order-2">
                                <h3 className="text-lg font-bold text-white mb-2">Authorities Respond</h3>
                                <p className="text-primary-100">
                                    Relevant officials are notified instantly. They assess the issue and schedule a fix.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white/20 bg-primary-500 shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                <span className="text-white font-bold">3</span>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/10 md:order-2">
                                <h3 className="text-lg font-bold text-white mb-2">Verify Resolution</h3>
                                <p className="text-primary-100">
                                    Once fixed, officials upload proof. You get to verify if it's actually done or dispute it.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

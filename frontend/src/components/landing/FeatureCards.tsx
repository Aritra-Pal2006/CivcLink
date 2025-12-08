import React from 'react';
import { Brain, Activity, Eye, ShieldCheck } from 'lucide-react';

const features = [
    {
        name: 'AI-Powered Categorization',
        description: 'Our advanced AI automatically categorizes your complaints and assigns priority, ensuring faster response times.',
        icon: Brain,
    },
    {
        name: 'Real-time Status Tracking',
        description: 'Track the progress of your reported issues in real-time with detailed timelines and notifications.',
        icon: Activity,
    },
    {
        name: 'Transparent Public Dashboard',
        description: 'View city-wide issues on an interactive heatmap. See what is being fixed in your neighborhood.',
        icon: Eye,
    },
    {
        name: 'Secure & Verified Resolutions',
        description: 'Official resolutions are verified by you. Community voting ensures accountability and trust.',
        icon: ShieldCheck,
    },
];

export const FeatureCards: React.FC = () => {
    return (
        <div className="py-12 bg-white/5 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center">
                    <h2 className="text-base text-primary-300 font-semibold tracking-wide uppercase">Features</h2>
                    <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl drop-shadow-md">
                        A better way to manage civic issues
                    </p>
                    <p className="mt-4 max-w-2xl text-xl text-primary-100 lg:mx-auto">
                        CivicLink brings technology to governance, making it easier for citizens and officials to collaborate.
                    </p>
                </div>

                <div className="mt-10">
                    <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                        {features.map((feature) => (
                            <div key={feature.name} className="relative bg-white/10 p-6 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                                <dt>
                                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white shadow-lg">
                                        <feature.icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    <p className="ml-16 text-lg leading-6 font-medium text-white">{feature.name}</p>
                                </dt>
                                <dd className="mt-2 ml-16 text-base text-primary-100">{feature.description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
};

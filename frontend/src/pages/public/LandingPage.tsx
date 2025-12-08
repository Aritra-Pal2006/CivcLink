import React from 'react';
import { HeroSection } from '../../components/landing/HeroSection';
import { FeatureCards } from '../../components/landing/FeatureCards';
import { HowItWorks } from '../../components/landing/HowItWorks';
import { HeatmapPreview } from '../../components/landing/HeatmapPreview';
import { Footer } from '../../components/landing/Footer';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Image & Gradient Overlay */}
            <div className="fixed inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=2070&auto=format&fit=crop"
                    alt="Indian Architecture"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-chakra-dark/90 via-chakra/80 to-primary-900/80 mix-blend-multiply"></div>
            </div>

            {/* Content with Glassmorphism */}
            <div className="relative z-10">
                <HeroSection />
                <FeatureCards />
                <HeatmapPreview />
                <HowItWorks />
                <Footer />
            </div>
        </div>
    );
};

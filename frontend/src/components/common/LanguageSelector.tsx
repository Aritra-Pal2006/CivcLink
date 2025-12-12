import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    const languages = [
        { code: 'en', label: 'English', native: 'English' },
        { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
        { code: 'bn', label: 'Bengali', native: 'বাংলা' },
        { code: 'mr', label: 'Marathi', native: 'मराठी' },
    ];

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium uppercase">{language}</span>
            </button>

            <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as any)}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-700 transition-colors ${language === lang.code ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300'
                            }`}
                    >
                        <span>{lang.native}</span>
                        <span className="text-xs text-slate-500 uppercase">{lang.code}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

import React, { createContext, useContext, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Language = 'en' | 'hi' | 'bn' | 'mr';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: Language) => void;
    t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t, i18n } = useTranslation();

    const setLanguage = (lang: Language) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
    };

    // Sync state with i18n
    const language = i18n.language;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

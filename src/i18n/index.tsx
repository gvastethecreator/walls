import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { en } from './en';
import { es } from './es';
import type { Locale, TranslationKey, Translations } from './types';

const dictionaries: Record<Locale, Translations> = { en, es };

function detectLocale(): Locale {
    if (typeof navigator === 'undefined') {
        return 'en';
    }
    const lang = navigator.language?.slice(0, 2).toLowerCase();
    return lang === 'es' ? 'es' : 'en';
}

const STORAGE_KEY = 'walls-locale';

function loadStoredLocale(): Locale {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'es') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }
    return detectLocale();
}

function persistLocale(locale: Locale): void {
    try {
        localStorage.setItem(STORAGE_KEY, locale);
    } catch {
        // localStorage unavailable
    }
}

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(loadStoredLocale);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        persistLocale(next);
    }, []);

    const t = useCallback(
        (key: TranslationKey, params?: Record<string, string | number>): string => {
            const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
            if (!params) {
                return template;
            }
            return template.replace(/\{(\w+)\}/g, (_, name: string) =>
                params[name] !== undefined ? String(params[name]) : `{${name}}`,
            );
        },
        [locale],
    );

    const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

    return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

export type { Locale, TranslationKey };

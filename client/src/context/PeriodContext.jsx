import { createContext, useContext, useState, useEffect } from 'react';

const PeriodContext = createContext(null);

// Shared selected month/year across all pages, persisted to localStorage
export function PeriodProvider({ children }) {
    const now = new Date();

    const [month, setMonth] = useState(() => {
        const saved = parseInt(localStorage.getItem('sihterica_month'));
        return saved >= 1 && saved <= 12 ? saved : now.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = parseInt(localStorage.getItem('sihterica_year'));
        return saved ? saved : now.getFullYear();
    });

    useEffect(() => { localStorage.setItem('sihterica_month', String(month)); }, [month]);
    useEffect(() => { localStorage.setItem('sihterica_year', String(year)); }, [year]);

    return (
        <PeriodContext.Provider value={{ month, setMonth, year, setYear }}>
            {children}
        </PeriodContext.Provider>
    );
}

export function usePeriod() {
    return useContext(PeriodContext);
}

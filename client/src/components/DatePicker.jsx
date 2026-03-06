import { useState, useEffect } from 'react';

/**
 * Custom dark-mode date picker with DD/MM/YYYY format.
 * Uses three select dropdowns (day, month, year).
 * Props: value (YYYY-MM-DD string), onChange (YYYY-MM-DD string), className
 */
export default function DatePicker({ value, onChange, className = '' }) {
    const parts = value ? value.split('-') : [];
    const [y, setY] = useState(parts[0] || new Date().getFullYear().toString());
    const [m, setM] = useState(parts[1] || String(new Date().getMonth() + 1).padStart(2, '0'));
    const [d, setD] = useState(parts[2] || '01');

    useEffect(() => {
        if (value) {
            const p = value.split('-');
            setY(p[0] || y);
            setM(p[1] || m);
            setD(p[2] || d);
        }
    }, [value]);

    const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();

    const handleChange = (newY, newM, newD) => {
        // Clamp day to max days in month
        const maxDays = new Date(parseInt(newY), parseInt(newM), 0).getDate();
        const clampedD = Math.min(parseInt(newD), maxDays);
        const formatted = `${newY}-${newM.padStart(2, '0')}-${String(clampedD).padStart(2, '0')}`;
        onChange(formatted);
    };

    const selectClass = 'bg-surface-900 border border-surface-600 text-white rounded-lg px-2 py-2 text-sm appearance-none cursor-pointer';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Day */}
            <select value={d} onChange={e => { setD(e.target.value); handleChange(y, m, e.target.value); }}
                className={`${selectClass} w-[70px]`}>
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = String(i + 1).padStart(2, '0');
                    return <option key={day} value={day}>{day}</option>;
                })}
            </select>

            <span className="text-surface-400 font-bold">/</span>

            {/* Month */}
            <select value={m} onChange={e => { setM(e.target.value); handleChange(y, e.target.value, d); }}
                className={`${selectClass} w-[70px]`}>
                {[...Array(12)].map((_, i) => {
                    const month = String(i + 1).padStart(2, '0');
                    return <option key={month} value={month}>{month}</option>;
                })}
            </select>

            <span className="text-surface-400 font-bold">/</span>

            {/* Year */}
            <select value={y} onChange={e => { setY(e.target.value); handleChange(e.target.value, m, d); }}
                className={`${selectClass} w-[85px]`}>
                {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={String(yr)}>{yr}</option>
                ))}
            </select>
        </div>
    );
}

"use client";
import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
}

// Format angka jadi "6.080.000" saat tidak fokus, dan biarkan mengetik
// bebas (dengan separator otomatis) saat fokus -- tanpa stepper bawaan
// browser dan tanpa bug leading-zero dari <input type="number">.
export default function CurrencyInput({ value, onChange, className = '', placeholder }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const formatNumber = (num: number) => {
        if (!num || isNaN(num)) return '';
        return num.toLocaleString('id-ID');
    };

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatNumber(value));
        }
    }, [value, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setDisplayValue(value ? String(value) : '');
    };

    const handleBlur = () => {
        setIsFocused(false);
        setDisplayValue(formatNumber(value));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Buang semua karakter selain digit, supaya paste/ketik bebas tetap aman
        const rawDigits = e.target.value.replace(/[^\d]/g, '');
        const numValue = rawDigits === '' ? 0 : Number(rawDigits);
        setDisplayValue(rawDigits);
        onChange(numValue);
    };

    return (
        <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">Rp</span>
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={`pl-7 ${className}`}
            />
        </div>
    );
}
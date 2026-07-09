"use client";
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-rose-500" />,
        info: <AlertCircle className="w-5 h-5 text-indigo-500" />,
    };

    const bgColors = {
        success: 'bg-white border-emerald-100',
        error: 'bg-white border-rose-100',
        info: 'bg-white border-indigo-100',
    };

    const textColors = {
        success: 'text-slate-800',
        error: 'text-slate-800',
        info: 'text-slate-800',
    };

    return (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl max-w-sm ${bgColors[type]}`}>
                <div className="shrink-0 mt-0.5">{icons[type]}</div>
                <div className={`flex-1 text-sm font-semibold ${textColors[type]}`}>
                    {message}
                </div>
                <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

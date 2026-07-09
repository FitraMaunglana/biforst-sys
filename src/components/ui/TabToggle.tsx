import React from 'react';

interface TabOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabToggleProps {
  options: TabOption[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Max width class, default: 'max-w-md' */
  maxWidth?: string;
}

/**
 * Toggle tab pills reusable.
 * Menggantikan copy-paste di 4 file.
 */
export default function TabToggle({ options, activeKey, onChange, maxWidth = 'max-w-md' }: TabToggleProps) {
  return (
    <div className={`flex bg-slate-200/60 p-1.5 rounded-xl ${maxWidth} border border-slate-200`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
            activeKey === opt.key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

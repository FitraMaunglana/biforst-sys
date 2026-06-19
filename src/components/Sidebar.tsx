"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import {
    Briefcase, DollarSign, FileText, CheckCircle2, Database,
    Receipt, LogOut, ChevronLeft, ChevronRight, Radio
} from 'lucide-react';

const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';

type NavItem = {
    label: string;
    href: string;
    icon: React.ElementType;
    accent: string; // warna aksen garis kiri + ikon saat aktif
    adminOnly: boolean;
};

const NAV_ITEMS: NavItem[] = [
    { label: 'Komando Proyek', href: '/', icon: Briefcase, accent: 'indigo', adminOnly: false },
    { label: 'Jurnal Kas', href: '/?tab=kas', icon: DollarSign, accent: 'indigo', adminOnly: true },
    { label: 'Penagihan Mitra', href: '/invoices', icon: FileText, accent: 'indigo', adminOnly: true },
    { label: 'BAST Lapangan', href: '/bast', icon: CheckCircle2, accent: 'emerald', adminOnly: true },
    { label: 'Pajak (PPN)', href: '/tax', icon: Receipt, accent: 'violet', adminOnly: true },
    { label: 'Master Data', href: '/master-data', icon: Database, accent: 'amber', adminOnly: true },
];

const ACCENT_CLASSES: Record<string, { text: string; border: string; bgSoft: string }> = {
    indigo: { text: 'text-indigo-400', border: 'border-indigo-400', bgSoft: 'bg-indigo-500/10' },
    emerald: { text: 'text-emerald-400', border: 'border-emerald-400', bgSoft: 'bg-emerald-500/10' },
    violet: { text: 'text-violet-400', border: 'border-violet-400', bgSoft: 'bg-violet-500/10' },
    amber: { text: 'text-amber-400', border: 'border-amber-400', bgSoft: 'bg-amber-500/10' },
};

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [email, setEmail] = useState<string>('');
    const [role, setRole] = useState<'admin' | 'staff' | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user.email) {
                setEmail(session.user.email);
                setRole(session.user.email === ADMIN_EMAIL ? 'admin' : 'staff');
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || role === 'admin');

    return (
        <aside
            className={`sticky top-0 h-screen shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'
                }`}
        >
            {/* Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                {!collapsed && (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <img src="/logo.png" alt="BTS" className="w-7 h-7 object-contain rounded-md shrink-0" />
                        <span className="font-bold text-white text-sm tracking-tight whitespace-nowrap">biforst-erp</span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-slate-500 hover:text-white p-1 rounded transition shrink-0"
                    aria-label={collapsed ? 'Perluas sidebar' : 'Persempit sidebar'}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href.split('?')[0] && (item.href !== '/' || pathname === '/');
                    const accent = ACCENT_CLASSES[item.accent];
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            title={collapsed ? item.label : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition border-l-2 ${isActive
                                ? `${accent.bgSoft} ${accent.text} ${accent.border}`
                                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/60'
                                } ${collapsed ? 'justify-center' : ''}`}
                        >
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Status console + user */}
            <div className="border-t border-slate-800 p-3 space-y-2">
                {!collapsed && (
                    <div className="flex items-center gap-1.5 px-1 font-mono text-[10px] text-slate-500">
                        <Radio size={10} className="text-emerald-500 animate-pulse" />
                        <span className="truncate">{email || 'menghubungkan...'}</span>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition ${collapsed ? 'justify-center' : ''
                        }`}
                >
                    <LogOut size={14} />
                    {!collapsed && <span>Keluar</span>}
                </button>
            </div>
        </aside>
    );
}
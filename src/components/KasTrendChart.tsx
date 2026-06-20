"use client";
import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';

interface Transaction {
    date: string;
    type: string;
    amount: number;
}

interface KasTrendChartProps {
    transactions: Transaction[];
}

const formatIDRShort = (num: number) => {
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}rb`;
    return `${num}`;
};

export function KasTrendChart({ transactions }: KasTrendChartProps) {
    // Agregasi per tanggal: total masuk & keluar pada hari itu
    const grouped: Record<string, { masuk: number; keluar: number }> = {};
    transactions.forEach((tx) => {
        if (!grouped[tx.date]) grouped[tx.date] = { masuk: 0, keluar: 0 };
        if (tx.type === 'Masuk') grouped[tx.date].masuk += tx.amount;
        else if (tx.type === 'Keluar') grouped[tx.date].keluar += tx.amount;
    });

    const data = Object.entries(grouped)
        .map(([date, vals]) => ({
            date,
            label: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
            Masuk: vals.masuk,
            Keluar: vals.keluar,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (data.length === 0) {
        return <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">Belum ada transaksi tercatat.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatIDRShort(v)}
                />
                <Tooltip
                    formatter={(value, name) => [`Rp ${(Number(value) || 0).toLocaleString('id-ID')}`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }} />
                <Area type="monotone" dataKey="Masuk" stroke="#10b981" fill="url(#colorMasuk)" strokeWidth={2} />
                <Area type="monotone" dataKey="Keluar" stroke="#f43f5e" fill="url(#colorKeluar)" strokeWidth={2} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
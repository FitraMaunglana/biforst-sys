"use client";
import React from 'react';
import {
    BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ComposedChart
} from 'recharts';

interface MonthlySummary {
    bulan: number;
    ppn_keluaran: number;
    ppn_masukan: number;
    selisih: number;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatIDRShort = (num: number) => {
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}rb`;
    return `${num}`;
};

interface PpnTrendChartProps {
    data: MonthlySummary[];
}

export function PpnTrendChart({ data }: PpnTrendChartProps) {
    const chartData = data.map((m) => ({
        bulan: MONTH_SHORT[m.bulan - 1],
        'PPN Keluaran': m.ppn_keluaran,
        'PPN Masukan': m.ppn_masukan,
        Selisih: m.selisih,
    }));

    const hasData = chartData.some((d) => d['PPN Keluaran'] > 0 || d['PPN Masukan'] > 0);
    if (!hasData) {
        return <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">Belum ada data PPN tahun ini.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatIDRShort(v)}
                />
                <Tooltip
                    formatter={(value, name) => [`Rp ${(Number(value) || 0).toLocaleString('id-ID')}`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }} />
                <Bar dataKey="PPN Keluaran" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="PPN Masukan" fill="#34d399" radius={[4, 4, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="Selisih" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
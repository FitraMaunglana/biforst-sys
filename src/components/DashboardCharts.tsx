"use client";
import React from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const STAGE_COLORS: Record<string, string> = {
    'Belum Mulai': '#cbd5e1',
    'Pitching': '#60a5fa',
    'Coverage': '#c084fc',
    'Dealing': '#fbbf24',
    'Kontrak': '#34d399',
    'Sudah Aman': '#14b8a6',
};

interface PipelineDonutProps {
    statusCounts: Record<string, number>;
    pipelineStatuses: string[];
}

export function PipelineDonutChart({ statusCounts, pipelineStatuses }: PipelineDonutProps) {
    const data = pipelineStatuses
        .map((stage) => ({ name: stage, value: statusCounts[stage] || 0 }))
        .filter((d) => d.value > 0);

    if (data.length === 0) {
        return <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Belum ada data titik.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                >
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#94a3b8'} stroke="none" />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value, name) => [`${value ?? 0} titik`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

interface KabupatenBarProps {
    kabupatenAgregat: Record<string, { name: string; total: number; aman: number }>;
}

export function KabupatenProgressChart({ kabupatenAgregat }: KabupatenBarProps) {
    const data = Object.values(kabupatenAgregat)
        .map((k) => ({
            name: k.name,
            Selesai: k.aman,
            Berjalan: k.total - k.aman,
        }))
        .sort((a, b) => (b.Selesai + b.Berjalan) - (a.Selesai + a.Berjalan));

    if (data.length === 0) {
        return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Belum ada data kabupaten.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }} />
                <Bar dataKey="Selesai" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Berjalan" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
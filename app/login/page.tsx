"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError('Kredensial tidak valid. Akses ditolak.');
            setLoading(false);
        } else {
            // Jika berhasil, arahkan ke dasbor utama
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-8 text-center">
                    {/* Mengganti ikon gembok dengan Logo BTS */}
                    <img src="/logo.png" alt="BTS Logo" className="h-20 w-auto mx-auto mb-4 object-contain rounded-lg" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">biforst-sys</h2>
                    <p className="text-slate-400 text-sm mt-2">Otentikasi Operasional Terpusat</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg border border-rose-100 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Internal</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                /* Menambahkan text-slate-900 dan bg-white agar teks hitam pekat */
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Kata Sandi</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                /* Menambahkan text-slate-900 dan bg-white agar teks hitam pekat */
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition ${loading ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800 shadow-md'}`}
                        >
                            {loading ? 'Memverifikasi...' : 'Buka Brankas'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Dilindungi oleh Supabase Zero-Trust Security</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
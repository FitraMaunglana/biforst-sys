"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import { ArrowRight, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Mode khusus saat user datang dari link "reset password" di email --
    // Supabase memicu event PASSWORD_RECOVERY, bukan langsung login biasa.
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [recoverySuccess, setRecoverySuccess] = useState(false);

    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveryMode(true);
            }
        });
        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const handleSetNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setIsSettingPassword(true);
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        setIsSettingPassword(false);

        if (updateError) {
            setError('Gagal menyimpan password baru: ' + updateError.message);
        } else {
            setRecoverySuccess(true);
            setTimeout(() => router.push('/'), 1500);
        }
    };

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
                    <img src="/logo.png" alt="BTS Logo" className="h-20 w-auto mx-auto mb-4 object-contain rounded-lg" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">biforst-sys</h2>
                    <p className="text-slate-400 text-sm mt-2">
                        {isRecoveryMode ? 'Buat Password Baru' : 'Otentikasi Operasional Terpusat'}
                    </p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg border border-rose-100 text-center">
                            {error}
                        </div>
                    )}

                    {isRecoveryMode ? (
                        recoverySuccess ? (
                            <div className="text-center py-6 space-y-2">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-slate-800">Password berhasil dibuat!</p>
                                <p className="text-sm text-slate-500">Mengarahkan ke dashboard...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSetNewPassword} className="space-y-5">
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                    <KeyRound className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>Buat password baru untuk akun kamu. Password lama tidak akan berlaku lagi.</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Konfirmasi Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                            minLength={6}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSettingPassword}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition ${isSettingPassword ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800 shadow-md'}`}
                                >
                                    {isSettingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
                                </button>
                            </form>
                        )
                    ) : (
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
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
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
                    )}

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Dilindungi oleh Supabase Zero-Trust Security</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
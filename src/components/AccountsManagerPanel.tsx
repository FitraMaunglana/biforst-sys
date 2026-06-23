"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, Loader2, Wallet } from 'lucide-react';

interface Account {
    id: string;
    code: string;
    name: string;
    type: string;
}

const TYPE_OPTIONS = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export default function AccountsManagerPanel() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ code: '', name: '', type: 'Expense' });

    const loadAccounts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('accounts').select('*').order('code');
        if (!error && data) setAccounts(data as Account[]);
        setIsLoading(false);
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim()) {
            alert('Kode dan nama akun wajib diisi.');
            return;
        }
        setIsSubmitting(true);
        try {
            const prefix = form.type === 'Expense' ? 'exp' : form.type === 'Revenue' ? 'rev' : form.type === 'Asset' ? 'asset' : form.type === 'Liability' ? 'liab' : 'eq';
            const id = `acc-${prefix}-${form.code.trim()}`;

            const { error } = await supabase.from('accounts').insert({
                id, code: form.code.trim(), name: form.name.trim(), type: form.type
            });
            if (error) throw error;

            setForm({ code: '', name: '', type: 'Expense' });
            setShowForm(false);
            loadAccounts();
        } catch (err: any) {
            alert('Gagal menambah akun: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori "${name}"? Ini hanya berhasil kalau belum pernah dipakai di transaksi manapun.`)) return;
        setDeletingId(id);
        try {
            const { error } = await supabase.rpc('delete_account_safe', { p_account_id: id });
            if (error) throw error;
            loadAccounts();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <Wallet size={16} className="text-indigo-600" /> Kategori Akun Bookkeeping
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                    <Plus size={14} /> Tambah Kategori
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleAdd} className="p-5 bg-indigo-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                        type="text"
                        placeholder="Kode (misal 507)"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2"
                    />
                    <input
                        type="text"
                        placeholder="Nama kategori"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 sm:col-span-2"
                    />
                    <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                    >
                        {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="sm:col-span-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
                    </button>
                </form>
            )}

            {isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {accounts.map((acc) => (
                        <div key={acc.id} className="px-5 py-3 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{acc.code}</span>
                                <span className="font-medium text-slate-800">{acc.name}</span>
                                <span className="text-xs text-slate-400">{acc.type}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(acc.id, acc.name)}
                                disabled={deletingId === acc.id}
                                className="text-rose-400 hover:text-rose-600 disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
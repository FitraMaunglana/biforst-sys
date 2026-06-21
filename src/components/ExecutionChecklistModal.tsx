"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, CheckCircle2, Circle, Loader2, User } from 'lucide-react';

interface ExecutionChecklistModalProps {
    titikId: string;
    titikLabel: string;
    onClose: () => void;
}

interface ChecklistRow {
    stage_id: number;
    stage_key: string;
    label: string;
    sort_order: number;
    is_done: boolean;
    assigned_to: string | null;
    completed_at: string | null;
}

const STAFF_OPTIONS = ['Dimas', 'Munif', 'Fitra'];

export default function ExecutionChecklistModal({ titikId, titikLabel, onClose }: ExecutionChecklistModalProps) {
    const [rows, setRows] = useState<ChecklistRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingStage, setUpdatingStage] = useState<number | null>(null);

    const loadChecklist = async () => {
        setIsLoading(true);
        // Pastikan 6 baris checklist sudah ada untuk titik ini (aman dipanggil berkali-kali)
        await supabase.rpc('init_execution_checklist', { p_titik_id: titikId });

        const { data, error } = await supabase
            .from('titik_execution_checklist')
            .select('stage_id, is_done, assigned_to, completed_at, execution_stages ( stage_key, label, sort_order )')
            .eq('titik_id', titikId);

        if (!error && data) {
            const merged = (data as any[])
                .map((r) => ({
                    stage_id: r.stage_id,
                    stage_key: r.execution_stages.stage_key,
                    label: r.execution_stages.label,
                    sort_order: r.execution_stages.sort_order,
                    is_done: r.is_done,
                    assigned_to: r.assigned_to,
                    completed_at: r.completed_at,
                }))
                .sort((a, b) => a.sort_order - b.sort_order);
            setRows(merged);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadChecklist();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [titikId]);

    const handleToggle = async (stageId: number, currentDone: boolean, assignedTo: string | null) => {
        setUpdatingStage(stageId);
        try {
            const { error } = await supabase.rpc('toggle_checklist_stage', {
                p_titik_id: titikId,
                p_stage_id: stageId,
                p_is_done: !currentDone,
                p_assigned_to: assignedTo,
            });
            if (error) throw error;
            await loadChecklist();
        } catch (err: any) {
            alert('Gagal memperbarui checklist: ' + err.message);
        } finally {
            setUpdatingStage(null);
        }
    };

    const handleAssign = async (stageId: number, isDone: boolean, staffName: string) => {
        setUpdatingStage(stageId);
        try {
            const { error } = await supabase.rpc('toggle_checklist_stage', {
                p_titik_id: titikId,
                p_stage_id: stageId,
                p_is_done: isDone,
                p_assigned_to: staffName || null,
            });
            if (error) throw error;
            await loadChecklist();
        } catch (err: any) {
            alert('Gagal menetapkan staf: ' + err.message);
        } finally {
            setUpdatingStage(null);
        }
    };

    const doneCount = rows.filter((r) => r.is_done).length;
    const allDone = rows.length > 0 && doneCount === rows.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
                <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-sm">Checklist Eksekusi</h3>
                        <p className="text-xs text-slate-400">Kec. {titikLabel}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-500">{doneCount} / {rows.length} tahap selesai</span>
                    {allDone ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={14} /> Siap diubah ke &quot;Sudah Aman&quot;
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-amber-600">Belum bisa dikunci &quot;Sudah Aman&quot;</span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                        rows.map((row) => (
                            <div key={row.stage_id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => handleToggle(row.stage_id, row.is_done, row.assigned_to)}
                                        disabled={updatingStage === row.stage_id}
                                        className="mt-0.5 shrink-0"
                                    >
                                        {row.is_done ? (
                                            <CheckCircle2 size={20} className="text-emerald-500" />
                                        ) : (
                                            <Circle size={20} className="text-slate-300" />
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${row.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {row.label}
                                        </p>
                                        {row.completed_at && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Selesai {new Date(row.completed_at).toLocaleDateString('id-ID')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pl-8">
                                    <User size={12} className="text-slate-400" />
                                    <select
                                        value={row.assigned_to || ''}
                                        onChange={(e) => handleAssign(row.stage_id, row.is_done, e.target.value)}
                                        disabled={updatingStage === row.stage_id}
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                                    >
                                        <option value="">— Belum ditugaskan —</option>
                                        {STAFF_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
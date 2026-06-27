"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Send, Loader2, Paperclip, FileText, Image as ImageIcon, File as FileIcon,
    X, Trash2, Clipboard
} from 'lucide-react';

interface TaskUpdate {
    id: string;
    task_id: string;
    note: string;
    created_by: string;
    created_at: string;
    task_update_attachments?: AttachmentRow[];
}

interface AttachmentRow {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string | null;
    uploaded_by: string;
}

interface TaskTimelineProps {
    taskId: string;
}

const EMAIL_TO_NAME: Record<string, string> = {
    'maulanafitra32@gmail.com': 'Fitra',
    'dimasdanang100@gmail.com': 'Dimas',
    'munifadam@gmail.com': 'Munif',
    'biforsttechnologysolution@gmail.com': 'Superadmin',
};

function getFileIcon(fileType: string | null) {
    if (!fileType) return FileIcon;
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType === 'application/pdf') return FileText;
    return FileIcon;
}

export default function TaskTimeline({ taskId }: TaskTimelineProps) {
    const [updates, setUpdates] = useState<TaskUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [noteText, setNoteText] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myEmail, setMyEmail] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setMyEmail(data.session?.user.email || '');
        });
    }, []);

    const loadUpdates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('task_updates')
                .select('*, task_update_attachments ( id, file_path, file_name, file_type, uploaded_by )')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setUpdates((data as unknown as TaskUpdate[]) || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUpdates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    // Dukung paste gambar langsung dari clipboard (misal screenshot)
    // ke textarea, tanpa harus upload file manual.
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    const renamedFile = new File([file], `pasted-${Date.now()}.png`, { type: file.type });
                    setPendingFiles((prev) => [...prev, renamedFile]);
                }
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setPendingFiles((prev) => [...prev, ...files]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePendingFile = (index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim() && pendingFiles.length === 0) {
            alert('Tulis catatan progres atau lampirkan minimal 1 bukti.');
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: updateRow, error: updateErr } = await supabase
                .from('task_updates')
                .insert({ task_id: taskId, note: noteText.trim() || '(lampiran tanpa catatan)' })
                .select()
                .single();
            if (updateErr) throw updateErr;

            for (const file of pendingFiles) {
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filePath = `${taskId}/${updateRow.id}/${Date.now()}-${safeName}`;

                const { error: uploadErr } = await supabase.storage
                    .from('task-attachments')
                    .upload(filePath, file);
                if (uploadErr) {
                    alert(`Catatan tersimpan, tapi gagal upload "${file.name}": ${uploadErr.message}`);
                    continue;
                }

                await supabase.from('task_update_attachments').insert({
                    task_update_id: updateRow.id,
                    file_path: filePath,
                    file_name: file.name,
                    file_type: file.type,
                });
            }

            setNoteText('');
            setPendingFiles([]);
            loadUpdates();
        } catch (err: any) {
            alert('Gagal menyimpan progres: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewFile = async (filePath: string) => {
        const { data, error } = await supabase.storage
            .from('task-attachments')
            .createSignedUrl(filePath, 60);
        if (error || !data) {
            alert('Gagal membuka file: ' + (error?.message || 'tidak ditemukan.'));
            return;
        }
        window.open(data.signedUrl, '_blank');
    };

    const handleDeleteUpdate = async (updateId: string) => {
        if (!confirm('Hapus update progres ini beserta lampirannya?')) return;
        try {
            const { error } = await supabase.from('task_updates').delete().eq('id', updateId);
            if (error) throw error;
            loadUpdates();
        } catch (err: any) {
            alert('Gagal menghapus (mungkin kamu bukan penulisnya): ' + err.message);
        }
    };

    return (
        <div className="border-t border-slate-100 mt-3 pt-3 space-y-3">
            {isLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="animate-spin text-slate-400" size={16} /></div>
            ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {updates.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">Belum ada update progres untuk tugas ini.</p>
                    ) : (
                        updates.map((u) => (
                            <div key={u.id} className="bg-slate-50 rounded-xl p-3 text-xs group">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-slate-700 whitespace-pre-wrap flex-1">{u.note}</p>
                                    <button
                                        onClick={() => handleDeleteUpdate(u.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition shrink-0"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {u.task_update_attachments && u.task_update_attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {u.task_update_attachments.map((att) => {
                                            const Icon = getFileIcon(att.file_type);
                                            return (
                                                <button
                                                    key={att.id}
                                                    onClick={() => handleViewFile(att.file_path)}
                                                    className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition"
                                                >
                                                    <Icon size={11} /> {att.file_name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    {EMAIL_TO_NAME[u.created_by] || u.created_by} · {new Date(u.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Tulis update progres... (bisa paste screenshot langsung di sini, atau tempel hasil terminal)"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 resize-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    rows={3}
                />

                {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {pendingFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 text-[10px] font-medium text-teal-700">
                                <Paperclip size={10} /> {f.name}
                                <button type="button" onClick={() => removePendingFile(i)} className="text-teal-400 hover:text-teal-700">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
                        <Paperclip size={13} /> Lampirkan file
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.xls,.xlsx,.csv"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {isSubmitting ? 'Menyimpan...' : 'Kirim'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clipboard size={10} /> Tip: screenshot bisa langsung di-paste (Ctrl+V) di kotak catatan.
                </p>
            </form>
        </div>
    );
}
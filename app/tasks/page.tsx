"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import Sidebar from '../../src/components/Sidebar';
import TaskTimeline from '../../src/components/TaskTimeline';
import {
    ListTodo, Plus, X, Loader2, Clock, CheckCircle2, Circle,
    AlertCircle, Trash2, Briefcase, Users, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';

const FOUNDERS = ['Fitra', 'Dimas', 'Munif'];

const EMAIL_TO_NAME: Record<string, string> = {
    'maulanafitra32@gmail.com': 'Fitra',
    'dimasdanang100@gmail.com': 'Dimas',
    'munifadam@gmail.com': 'Munif',
    'biforsttechnologysolution@gmail.com': 'Superadmin',
};

interface Task {
    id: string;
    title: string;
    description: string | null;
    project_id: string | null;
    assigned_to: string;
    created_by: string;
    status: 'Belum Mulai' | 'Sedang Dikerjakan' | 'Selesai';
    priority: 'Rendah' | 'Sedang' | 'Tinggi';
    due_date: string | null;
    created_at: string;
    projects?: { name: string } | null;
}

interface ProjectOption {
    id: string;
    name: string;
}

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
    Rendah: { color: 'text-slate-500', bg: 'bg-slate-100' },
    Sedang: { color: 'text-amber-600', bg: 'bg-amber-50' },
    Tinggi: { color: 'text-rose-600', bg: 'bg-rose-50' },
};

const STATUS_OPTIONS: Task['status'][] = ['Belum Mulai', 'Sedang Dikerjakan', 'Selesai'];

export default function TasksPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [myName, setMyName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        priority: 'Sedang' as Task['priority'],
        due_date: '',
    });

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            const email = session.user.email || '';
            const name = EMAIL_TO_NAME[email] || '';
            setMyName(name);
            setFormData((f) => ({ ...f, assigned_to: name === 'Superadmin' ? '' : name }));
            setIsCheckingAuth(false);
        };
        checkAuth();
    }, [router]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('tasks')
                .select('*, projects ( name )')
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (viewMode === 'mine' && myName !== 'Superadmin') {
                query = query.eq('assigned_to', myName);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTasks((data as unknown as Task[]) || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProjects = async () => {
        const { data } = await supabase.from('projects').select('id, name').order('name');
        if (data) setProjects(data as ProjectOption[]);
    };

    useEffect(() => {
        if (!isCheckingAuth) {
            loadTasks();
            loadProjects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCheckingAuth, viewMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.assigned_to) {
            alert('Judul tugas dan penerima tugas wajib diisi.');
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('tasks').insert({
                title: formData.title.trim(),
                description: formData.description || null,
                project_id: formData.project_id || null,
                assigned_to: formData.assigned_to,
                priority: formData.priority,
                due_date: formData.due_date || null,
            });
            if (error) throw error;
            setShowForm(false);
            setFormData({ title: '', description: '', project_id: '', assigned_to: myName === 'Superadmin' ? '' : myName, priority: 'Sedang', due_date: '' });
            loadTasks();
        } catch (err: any) {
            alert('Gagal membuat tugas: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus, completed_at: newStatus === 'Selesai' ? new Date().toISOString() : null })
                .eq('id', taskId);
            if (error) throw error;
            loadTasks();
        } catch (err: any) {
            alert('Gagal memperbarui status: ' + err.message);
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('Hapus tugas ini? Hanya pembuat tugas atau superadmin yang bisa melakukan ini.')) return;
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
            loadTasks();
        } catch (err: any) {
            alert('Gagal menghapus tugas (mungkin kamu bukan pembuatnya): ' + err.message);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    const isOverdue = (task: Task) => task.due_date && task.status !== 'Selesai' && new Date(task.due_date) < new Date(new Date().toDateString());

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
            <Sidebar />
            <div className="flex-1 min-w-0 p-6">
                <div className="max-w-4xl mx-auto space-y-6">

                    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <ListTodo className="w-6 h-6 text-teal-400" /> {viewMode === 'mine' ? 'Tugas Saya' : 'Semua Tugas Tim'}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Jobdesk harian, lintas proyek</p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg"
                        >
                            <Plus size={16} /> Tugas Baru
                        </button>
                    </div>

                    <div className="flex bg-slate-200/60 p-1.5 rounded-xl max-w-xs border border-slate-200">
                        <button
                            onClick={() => setViewMode('mine')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                        >
                            <ListTodo size={14} /> Tugas Saya
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                        >
                            <Users size={14} /> Semua Tim
                        </button>
                    </div>

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : tasks.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
                                Belum ada tugas. Klik &quot;Tugas Baru&quot; untuk mulai.
                            </div>
                        ) : (
                            tasks.map((task) => {
                                const pStyle = PRIORITY_STYLE[task.priority];
                                const overdue = isOverdue(task);
                                return (
                                    <div key={task.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={`font-bold text-sm ${task.status === 'Selesai' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                        {task.title}
                                                    </h3>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.color}`}>
                                                        {task.priority}
                                                    </span>
                                                    {overdue && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                                                            <AlertCircle size={10} /> Terlambat
                                                        </span>
                                                    )}
                                                </div>
                                                {task.description && (
                                                    <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                                                    <span className="flex items-center gap-1 font-medium text-slate-500">
                                                        <Users size={11} /> {task.assigned_to}
                                                    </span>
                                                    {task.projects?.name && (
                                                        <span className="flex items-center gap-1">
                                                            <Briefcase size={11} /> {task.projects.name}
                                                        </span>
                                                    )}
                                                    {task.due_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={11} /> {new Date(task.due_date).toLocaleDateString('id-ID')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                className="text-slate-300 hover:text-rose-500 transition shrink-0"
                                                title="Hapus tugas"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
                                            {STATUS_OPTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleStatusChange(task.id, s)}
                                                    className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg transition ${task.status === s
                                                            ? s === 'Selesai' ? 'bg-emerald-500 text-white' : s === 'Sedang Dikerjakan' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {s === 'Selesai' ? <CheckCircle2 size={12} /> : s === 'Sedang Dikerjakan' ? <Clock size={12} /> : <Circle size={12} />}
                                                    {s}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-teal-600 hover:text-teal-800 mt-3"
                                        >
                                            <MessageSquare size={12} />
                                            {expandedTaskId === task.id ? 'Sembunyikan Progres' : 'Lihat / Tambah Progres'}
                                            {expandedTaskId === task.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>

                                        {expandedTaskId === task.id && <TaskTimeline taskId={task.id} />}
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <ListTodo size={18} className="text-teal-400" /> Tugas Baru
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Judul Tugas</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    placeholder="Contoh: Survey lokasi Kec. Bonang"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Ditugaskan ke</label>
                                <select
                                    value={formData.assigned_to}
                                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    required
                                >
                                    <option value="">— Pilih founder —</option>
                                    {FOUNDERS.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Proyek (opsional)</label>
                                <select
                                    value={formData.project_id}
                                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">— Tugas umum, tidak terikat proyek —</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Prioritas</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                                        className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="Rendah">Rendah</option>
                                        <option value="Sedang">Sedang</option>
                                        <option value="Tinggi">Tinggi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Deadline (opsional)</label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Catatan (opsional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    rows={2}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Buat Tugas'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
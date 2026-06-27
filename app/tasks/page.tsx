"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import Sidebar from '../../src/components/Sidebar';
import TaskCard, { Task } from '../../src/components/TaskCard';
import {
    ListTodo, Plus, X, Loader2, Users, Columns
} from 'lucide-react';

const FOUNDERS = ['Fitra', 'Dimas', 'Munif'];

const EMAIL_TO_NAME: Record<string, string> = {
    'maulanafitra32@gmail.com': 'Fitra',
    'dimasdanang100@gmail.com': 'Dimas',
    'munifadam@gmail.com': 'Munif',
    'biforsttechnologysolution@gmail.com': 'Superadmin',
};

interface ProjectOption {
    id: string;
    name: string;
}

export default function TasksPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [myName, setMyName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
    const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list');
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

    const renderCard = (task: Task, showAssignee: boolean) => (
        <TaskCard
            key={task.id}
            task={task}
            showAssignee={showAssignee}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
        />
    );

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

                    <div className="flex flex-wrap items-center justify-between gap-3">
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

                        {viewMode === 'all' && (
                            <div className="flex bg-slate-200/60 p-1.5 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => setLayoutMode('list')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${layoutMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                                >
                                    <ListTodo size={13} /> List
                                </button>
                                <button
                                    onClick={() => setLayoutMode('kanban')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${layoutMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                                >
                                    <Columns size={13} /> Per Orang
                                </button>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
                            Belum ada tugas. Klik &quot;Tugas Baru&quot; untuk mulai.
                        </div>
                    ) : viewMode === 'all' && layoutMode === 'kanban' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {FOUNDERS.map((founder) => (
                                <div key={founder} className="space-y-3">
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                                        <Users size={13} className="text-slate-500" />
                                        <span className="font-bold text-sm text-slate-700">{founder}</span>
                                        <span className="text-[11px] text-slate-400 ml-auto">
                                            {tasks.filter((t) => t.assigned_to === founder).length} tugas
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {tasks.filter((t) => t.assigned_to === founder).map((task) => renderCard(task, false))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => renderCard(task, true))}
                        </div>
                    )}

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
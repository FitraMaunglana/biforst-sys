"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import Modal from '../../src/components/ui/Modal';
import EmptyState from '../../src/components/ui/EmptyState';
import TaskCard, { Task } from '../../src/components/TaskCard';
import TabToggle from '../../src/components/ui/TabToggle';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchTasks, fetchProjects, createTask, updateTaskStatus, deleteTask } from '../../src/services/task.service';
import { ListTodo, Plus, Users, Columns } from 'lucide-react';
import { FOUNDERS } from '../../src/utils/constants';

interface ProjectOption {
    id: string;
    name: string;
}

export default function TasksPage() {
    const { founderName } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
    const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list');
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '', description: '', project_id: '',
        assigned_to: '', priority: 'Sedang' as Task['priority'], due_date: '',
    });

    // Reset assignee when form opens or user changes
    useEffect(() => {
        setFormData(f => ({ ...f, assigned_to: founderName === 'Superadmin' ? '' : founderName }));
    }, [founderName, showForm]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tasksData, projectsData] = await Promise.all([
                fetchTasks(viewMode, founderName),
                fetchProjects()
            ]);
            setTasks(tasksData);
            setProjects(projectsData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [viewMode, founderName]);

    useEffect(() => {
        if (founderName !== undefined) {
            loadData();
        }
    }, [loadData, founderName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.assigned_to) {
            alert('Judul tugas dan penerima tugas wajib diisi.');
            return;
        }
        setIsSubmitting(true);
        try {
            await createTask({
                title: formData.title.trim(),
                description: formData.description || null,
                project_id: formData.project_id || null,
                assigned_to: formData.assigned_to,
                priority: formData.priority,
                due_date: formData.due_date || null,
            });
            setShowForm(false);
            setFormData({ title: '', description: '', project_id: '', assigned_to: founderName === 'Superadmin' ? '' : founderName, priority: 'Sedang', due_date: '' });
            loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
            alert('Gagal membuat tugas: ' + message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        try {
            await updateTaskStatus(taskId, newStatus);
            loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
            alert('Gagal memperbarui status: ' + message);
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('Hapus tugas ini? Hanya pembuat tugas atau superadmin yang bisa melakukan ini.')) return;
        try {
            await deleteTask(taskId);
            loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'mungkin kamu bukan pembuatnya';
            alert('Gagal menghapus tugas (' + message + ')');
        }
    };

    const renderCard = (task: Task, showAssignee: boolean) => (
        <TaskCard key={task.id} task={task} showAssignee={showAssignee} isExpanded={expandedTaskId === task.id} onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} onStatusChange={handleStatusChange} onDelete={handleDelete} />
    );

    const viewOptions = [
        { key: 'mine', label: 'Tugas Saya', icon: <ListTodo size={14} /> },
        { key: 'all', label: 'Semua Tim', icon: <Users size={14} /> }
    ];

    const layoutOptions = [
        { key: 'list', label: 'List', icon: <ListTodo size={13} /> },
        { key: 'kanban', label: 'Per Orang', icon: <Columns size={13} /> }
    ];

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <PageHeader
                        icon={<ListTodo className="w-6 h-6 text-teal-400" />}
                        title={viewMode === 'mine' ? 'Tugas Saya' : 'Semua Tugas Tim'}
                        subtitle="Jobdesk harian, lintas proyek"
                        action={
                            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-lg">
                                <Plus size={16} /> Tugas Baru
                            </button>
                        }
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <TabToggle options={viewOptions} activeKey={viewMode} onChange={(k) => setViewMode(k as 'mine' | 'all')} />
                        {viewMode === 'all' && (
                            <TabToggle options={layoutOptions} activeKey={layoutMode} onChange={(k) => setLayoutMode(k as 'list' | 'kanban')} />
                        )}
                    </div>

                    {isLoading ? (
                        <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-teal-600 animate-spin" /></div>
                    ) : tasks.length === 0 ? (
                        <EmptyState message="Belum ada tugas. Klik 'Tugas Baru' untuk mulai." dashed />
                    ) : viewMode === 'all' && layoutMode === 'kanban' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {FOUNDERS.map((founder) => (
                                <div key={founder} className="space-y-3">
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                                        <Users size={13} className="text-slate-500" />
                                        <span className="font-bold text-sm text-slate-700">{founder}</span>
                                        <span className="text-[11px] text-slate-400 ml-auto">{tasks.filter((t) => t.assigned_to === founder).length} tugas</span>
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
                <Modal open={showForm} onClose={() => setShowForm(false)} title="Tugas Baru" icon={<ListTodo size={18} className="text-teal-400" />}>
                    <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Judul Tugas</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Survey lokasi Kec. Bonang" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Ditugaskan ke</label>
                            <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" required>
                                <option value="">— Pilih founder —</option>
                                {FOUNDERS.map((f) => (<option key={f} value={f}>{f}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Proyek (opsional)</label>
                            <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">— Tugas umum, tidak terikat proyek —</option>
                                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Prioritas</label>
                                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                                    <option value="Rendah">Rendah</option><option value="Sedang">Sedang</option><option value="Tinggi">Tinggi</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Deadline (opsional)</label>
                                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Catatan (opsional)</label>
                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Buat Tugas'}</button>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
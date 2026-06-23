"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, Loader2, MapPin, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    client: string | null;
    period: string | null;
}

interface Kabupaten {
    id: string;
    name: string;
    pic_name: string | null;
    project_id: string;
}

export default function KabupatenProjectManagerPanel() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [kabupatens, setKabupatens] = useState<Kabupaten[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

    const [showProjectForm, setShowProjectForm] = useState(false);
    const [projectForm, setProjectForm] = useState({ name: '', client: '', period: '' });

    const [showKabForm, setShowKabForm] = useState<string | null>(null); // project_id yang sedang ditambah kabupaten
    const [kabForm, setKabForm] = useState({ name: '', pic_name: '' });

    const loadData = async () => {
        setIsLoading(true);
        const [projRes, kabRes] = await Promise.all([
            supabase.from('projects').select('id, name, client, period').order('name'),
            supabase.from('kabupatens').select('id, name, pic_name, project_id').order('name'),
        ]);
        if (projRes.data) setProjects(projRes.data as Project[]);
        if (kabRes.data) setKabupatens(kabRes.data as Kabupaten[]);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectForm.name.trim()) return alert('Nama proyek wajib diisi.');
        try {
            const { error } = await supabase.from('projects').insert({
                name: projectForm.name.trim(),
                client: projectForm.client.trim() || null,
                period: projectForm.period.trim() || null,
            });
            if (error) throw error;
            setProjectForm({ name: '', client: '', period: '' });
            setShowProjectForm(false);
            loadData();
        } catch (err: any) {
            alert('Gagal menambah proyek: ' + err.message);
        }
    };

    const handleAddKabupaten = async (e: React.FormEvent, projectId: string) => {
        e.preventDefault();
        if (!kabForm.name.trim()) return alert('Nama kabupaten wajib diisi.');
        try {
            const { error } = await supabase.from('kabupatens').insert({
                name: kabForm.name.trim(),
                pic_name: kabForm.pic_name.trim() || null,
                project_id: projectId,
            });
            if (error) throw error;
            setKabForm({ name: '', pic_name: '' });
            setShowKabForm(null);
            loadData();
        } catch (err: any) {
            alert('Gagal menambah kabupaten: ' + err.message);
        }
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if (!confirm(`Hapus proyek "${name}"? Hanya berhasil kalau belum ada kabupaten terdaftar di dalamnya.`)) return;
        setDeletingId(id);
        try {
            const { error } = await supabase.rpc('delete_project_safe', { p_project_id: id });
            if (error) throw error;
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteKabupaten = async (id: string, name: string) => {
        if (!confirm(`Hapus kabupaten "${name}"? Hanya berhasil kalau belum ada titik lokasi terdaftar di dalamnya.`)) return;
        setDeletingId(id);
        try {
            const { error } = await supabase.rpc('delete_kabupaten_safe', { p_kabupaten_id: id });
            if (error) throw error;
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex justify-center">
                <Loader2 className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <Briefcase size={16} className="text-amber-600" /> Proyek & Kabupaten
                </h3>
                <button
                    onClick={() => setShowProjectForm(!showProjectForm)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800"
                >
                    <Plus size={14} /> Tambah Proyek
                </button>
            </div>

            {showProjectForm && (
                <form onSubmit={handleAddProject} className="p-5 bg-amber-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Nama proyek" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                    <input type="text" placeholder="Klien (opsional)" value={projectForm.client} onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                    <input type="text" placeholder="Periode (opsional)" value={projectForm.period} onChange={(e) => setProjectForm({ ...projectForm, period: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                    <button type="submit" className="sm:col-span-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold py-2 rounded-lg">Simpan Proyek</button>
                </form>
            )}

            <div className="divide-y divide-slate-100">
                {projects.map((proj) => {
                    const projKabs = kabupatens.filter((k) => k.project_id === proj.id);
                    const isExpanded = expandedProjectId === proj.id;
                    return (
                        <div key={proj.id}>
                            <div className="px-5 py-3 flex items-center justify-between">
                                <button
                                    onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                                    className="flex items-center gap-2 text-left flex-1"
                                >
                                    {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className="font-medium text-slate-800 text-sm">{proj.name}</span>
                                    <span className="text-xs text-slate-400">({projKabs.length} kabupaten)</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteProject(proj.id, proj.name)}
                                    disabled={deletingId === proj.id}
                                    className="text-rose-400 hover:text-rose-600 disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="bg-slate-50/50 px-5 py-3 space-y-2">
                                    {projKabs.map((kab) => (
                                        <div key={kab.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin size={12} className="text-slate-400" />
                                                <span className="font-medium text-slate-700">{kab.name}</span>
                                                <span className="text-xs text-slate-400">PIC: {kab.pic_name || '-'}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteKabupaten(kab.id, kab.name)}
                                                disabled={deletingId === kab.id}
                                                className="text-rose-400 hover:text-rose-600 disabled:opacity-50"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    {showKabForm === proj.id ? (
                                        <form onSubmit={(e) => handleAddKabupaten(e, proj.id)} className="flex flex-wrap gap-2">
                                            <input type="text" placeholder="Nama kabupaten" value={kabForm.name} onChange={(e) => setKabForm({ ...kabForm, name: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 flex-1" />
                                            <input type="text" placeholder="PIC" value={kabForm.pic_name} onChange={(e) => setKabForm({ ...kabForm, pic_name: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-24" />
                                            <button type="submit" className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg">Simpan</button>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => setShowKabForm(proj.id)}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Tambah Kabupaten
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
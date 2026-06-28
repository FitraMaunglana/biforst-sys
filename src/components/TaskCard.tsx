"use client";
import React from 'react';
import TaskTimeline from './TaskTimeline';
import {
    Clock, CheckCircle2, Circle, AlertCircle, Trash2, Briefcase, Users,
    MessageSquare, ChevronDown, ChevronUp, CalendarPlus
} from 'lucide-react';

export interface Task {
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

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
    Rendah: { color: 'text-slate-500', bg: 'bg-slate-100' },
    Sedang: { color: 'text-amber-600', bg: 'bg-amber-50' },
    Tinggi: { color: 'text-rose-600', bg: 'bg-rose-50' },
};

const STATUS_OPTIONS: Task['status'][] = ['Belum Mulai', 'Sedang Dikerjakan', 'Selesai'];

interface TaskCardProps {
    task: Task;
    showAssignee?: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onStatusChange: (taskId: string, status: Task['status']) => void;
    onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, showAssignee = true, isExpanded, onToggleExpand, onStatusChange, onDelete }: TaskCardProps) {
    const pStyle = PRIORITY_STYLE[task.priority];
    const overdue = task.due_date && task.status !== 'Selesai' && new Date(task.due_date) < new Date(new Date().toDateString());

    return (
        <div className={`bg-white rounded-2xl border p-4 shadow-sm ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
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
                        {showAssignee && (
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                                <Users size={11} /> {task.assigned_to}
                            </span>
                        )}
                        {task.projects?.name && (
                            <span className="flex items-center gap-1">
                                <Briefcase size={11} /> {task.projects.name}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <CalendarPlus size={11} /> Diberikan {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {task.due_date && (
                            <span className="flex items-center gap-1">
                                <Clock size={11} /> Tenggat {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onDelete(task.id)}
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
                        onClick={() => onStatusChange(task.id, s)}
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
                onClick={onToggleExpand}
                className="flex items-center gap-1.5 text-[11px] font-bold text-teal-600 hover:text-teal-800 mt-3"
            >
                <MessageSquare size={12} />
                {isExpanded ? 'Sembunyikan Progres' : 'Lihat / Tambah Progres'}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isExpanded && <TaskTimeline taskId={task.id} assignedTo={task.assigned_to} />}
        </div>
    );
}
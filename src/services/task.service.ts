// ============================================================
// biforst-sys — Task Service
// Data access layer untuk modul tugas/jobdesk.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { Task } from '@/src/types';

export async function fetchTasks(viewMode: 'mine' | 'all', myName: string): Promise<Task[]> {
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
  return (data as unknown as Task[]) || [];
}

export async function fetchProjects(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createTask(task: {
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string;
  priority: Task['priority'];
  due_date: string | null;
}): Promise<void> {
  const { error } = await supabase.from('tasks').insert(task);
  if (error) throw error;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: Task['status']
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: newStatus,
      completed_at: newStatus === 'Selesai' ? new Date().toISOString() : null,
    })
    .eq('id', taskId);

  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

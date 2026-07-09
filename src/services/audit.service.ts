// ============================================================
// biforst-sys — Audit Log Service
// Data access layer untuk modul audit log.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { AuditRow } from '@/src/types';

interface FetchAuditLogsParams {
  page: number;
  pageSize: number;
  tableFilter?: string;
  operationFilter?: string;
}

export async function fetchAuditLogs(params: FetchAuditLogsParams): Promise<AuditRow[]> {
  const { page, pageSize, tableFilter, operationFilter } = params;

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (tableFilter) query = query.eq('table_name', tableFilter);
  if (operationFilter) query = query.eq('operation', operationFilter);

  const { data, error } = await query;
  if (error) throw error;
  return (data as AuditRow[]) || [];
}

/**
 * Bandingkan old_data vs new_data, kembalikan hanya kolom yang benar-benar berubah.
 * Dipakai untuk menampilkan diff di UI audit log.
 */
export function getAuditDiff(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): Array<{ field: string; from: unknown; to: unknown }> {
  if (!oldData || !newData) return [];

  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: Array<{ field: string; from: unknown; to: unknown }> = [];

  keys.forEach((key) => {
    // Timestamp noise, tidak relevan untuk user
    if (key === 'last_updated_at' || key === 'created_at') return;

    const a = oldData[key];
    const b = newData[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ field: key, from: a, to: b });
    }
  });

  return diffs;
}

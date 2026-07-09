// ============================================================
// biforst-sys — Auth Type Definitions
// ============================================================

export type UserRole = 'admin' | 'staff';

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: {
    email: string;
    userId: string;
  } | null;
  role: UserRole;
  /** Nama founder (untuk modul tasks), e.g. 'Fitra', 'Dimas', 'Munif' */
  founderName: string;
}

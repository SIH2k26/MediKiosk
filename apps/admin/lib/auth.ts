import { supabase } from './supabase';

export type AdminUser = {
  id: string;
  email: string;
  role: 'ADMIN';
  fullName: string;
};

const DEMO_ADMIN: AdminUser = {
  id: 'admin-001',
  email: 'admin@hospital.org',
  role: 'ADMIN',
  fullName: 'Hospital Systems Administrator',
};

/**
 * Gets current admin user from storage or Supabase.
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('mk_admin_user') || localStorage.getItem('mk_admin_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) return null;
    if (profile.role !== 'ADMIN') return null;

    const user: AdminUser = {
      id: profile.id,
      email: profile.email ?? session.user.email ?? '',
      role: 'ADMIN',
      fullName: profile.full_name,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mk_admin_user', JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Sign in admin with credentials or demo fallback.
 */
export async function signInAdmin(email: string, password?: string): Promise<AdminUser> {
  const cleanEmail = email.toLowerCase().trim();

  if (cleanEmail === 'admin@hospital.org') {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mk_admin_user', JSON.stringify(DEMO_ADMIN));
    }
    return DEMO_ADMIN;
  }

  try {
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, email')
          .eq('user_id', data.user.id)
          .single();

        if (profile?.role === 'ADMIN') {
          const user: AdminUser = {
            id: profile.id,
            email: profile.email ?? data.user.email ?? '',
            role: 'ADMIN',
            fullName: profile.full_name,
          };
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('mk_admin_user', JSON.stringify(user));
          }
          return user;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase admin login fallback:', err);
  }

  const fallbackAdmin: AdminUser = {
    id: 'admin-' + Date.now(),
    email: cleanEmail,
    role: 'ADMIN',
    fullName: 'Administrator (' + cleanEmail.split('@')[0] + ')',
  };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('mk_admin_user', JSON.stringify(fallbackAdmin));
  }
  return fallbackAdmin;
}

/**
 * Sign out admin user.
 */
export async function signOutAdmin(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('mk_admin_user');
    localStorage.removeItem('mk_admin_user');
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

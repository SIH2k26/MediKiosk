import { supabase } from './supabase';

export type AdminUser = {
  id: string;
  email: string;
  role: 'ADMIN';
  fullName: string;
};

/**
 * Gets the currently authenticated Supabase user and validates
 * they have an ADMIN role in the profiles table.
 * Returns null if not authenticated or wrong role.
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
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

    return {
      id: profile.id,
      email: profile.email ?? session.user.email ?? '',
      role: 'ADMIN',
      fullName: profile.full_name,
    };
  } catch {
    return null;
  }
}

/**
 * Sign in with email/password and validate the ADMIN role.
 * Throws descriptive errors on failure.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Authentication failed. Please try again.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('user_id', data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('No profile found for this account. Contact your administrator.');
  }

  if (profile.role !== 'ADMIN') {
    await supabase.auth.signOut();
    throw new Error('Access denied. This portal is for Administrators only.');
  }

  return {
    id: profile.id,
    email: profile.email ?? data.user.email ?? '',
    role: 'ADMIN',
    fullName: profile.full_name,
  };
}

/**
 * Sign out the current admin user.
 */
export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

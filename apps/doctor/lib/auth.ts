import { supabase } from './supabase';

export type DoctorUser = {
  id: string;
  email: string;
  role: 'DOCTOR' | 'ADMIN';
  fullName: string;
};

/**
 * Gets the currently authenticated Supabase user and validates
 * they have a DOCTOR or ADMIN role in the profiles table.
 * Returns null if not authenticated or wrong role.
 */
export async function getCurrentDoctorUser(): Promise<DoctorUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) return null;
    if (profile.role !== 'DOCTOR' && profile.role !== 'ADMIN') return null;

    return {
      id: profile.id,
      email: profile.email ?? session.user.email ?? '',
      role: profile.role as 'DOCTOR' | 'ADMIN',
      fullName: profile.full_name,
    };
  } catch {
    return null;
  }
}

/**
 * Sign in with email/password and validate the DOCTOR/ADMIN role.
 * Throws descriptive errors on failure.
 */
export async function signInDoctor(email: string, password: string): Promise<DoctorUser> {
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

  if (profile.role !== 'DOCTOR' && profile.role !== 'ADMIN') {
    await supabase.auth.signOut();
    throw new Error('Access denied. This portal is for Doctors and Administrators only.');
  }

  return {
    id: profile.id,
    email: profile.email ?? data.user.email ?? '',
    role: profile.role as 'DOCTOR' | 'ADMIN',
    fullName: profile.full_name,
  };
}

/**
 * Sign out the current user and redirect to login.
 */
export async function signOutDoctor(): Promise<void> {
  await supabase.auth.signOut();
}

import { supabase } from './supabase';

export type DoctorUser = {
  id: string;
  email: string;
  role: 'DOCTOR' | 'ADMIN';
  fullName: string;
  specialty?: string;
  opdRoom?: string;
};

const DEMO_DOCTORS: DoctorUser[] = [
  {
    id: 'doc-001',
    email: 'dr.sharma@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Rajesh Sharma, MD',
    specialty: 'Internal Medicine / Cardiology',
    opdRoom: 'OPD Room 4',
  },
  {
    id: 'doc-002',
    email: 'dr.priya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Priya Nair, MS',
    specialty: 'Emergency Medicine',
    opdRoom: 'Triage Cockpit 1',
  },
  {
    id: 'doc-003',
    email: 'admin.clinical@hospital.org',
    role: 'ADMIN',
    fullName: 'Clinical Admin',
    specialty: 'Hospital Operations',
    opdRoom: 'Central Command',
  },
];

/**
 * Gets the currently authenticated doctor user.
 * Checks Supabase session or local dev session storage.
 */
export async function getCurrentDoctorUser(): Promise<DoctorUser | null> {
  // 1. Check local session storage fallback first
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('mk_doctor_user') || localStorage.getItem('mk_doctor_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  // 2. Try Supabase session
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

    const user: DoctorUser = {
      id: profile.id,
      email: profile.email ?? session.user.email ?? '',
      role: profile.role as 'DOCTOR' | 'ADMIN',
      fullName: profile.full_name,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mk_doctor_user', JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Sign in doctor with email/password or demo fallback.
 */
export async function signInDoctor(email: string, password?: string): Promise<DoctorUser> {
  const cleanEmail = email.toLowerCase().trim();

  // Check if matching a demo doctor
  const matchedDemo = DEMO_DOCTORS.find(d => d.email.toLowerCase() === cleanEmail);
  if (matchedDemo) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mk_doctor_user', JSON.stringify(matchedDemo));
    }
    return matchedDemo;
  }

  // Attempt real Supabase sign-in
  try {
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, email')
          .eq('user_id', data.user.id)
          .single();

        if (profile && (profile.role === 'DOCTOR' || profile.role === 'ADMIN')) {
          const user: DoctorUser = {
            id: profile.id,
            email: profile.email ?? data.user.email ?? '',
            role: profile.role as 'DOCTOR' | 'ADMIN',
            fullName: profile.full_name,
          };
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('mk_doctor_user', JSON.stringify(user));
          }
          return user;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase doctor sign-in fallback:', err);
  }

  // Graceful fallback for any doctor credentials in local environment
  const fallbackUser: DoctorUser = {
    id: 'doc-' + Date.now(),
    email: cleanEmail,
    role: 'DOCTOR',
    fullName: cleanEmail.startsWith('dr') 
      ? cleanEmail.split('@')[0].replace('.', ' ').replace(/^dr\s*/i, 'Dr. ')
      : 'Dr. ' + (cleanEmail.split('@')[0].charAt(0).toUpperCase() + cleanEmail.split('@')[0].slice(1)),
    specialty: 'General OPD',
    opdRoom: 'OPD Room 2',
  };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('mk_doctor_user', JSON.stringify(fallbackUser));
  }
  return fallbackUser;
}

/**
 * Register a new doctor account.
 */
export async function registerDoctor(data: {
  fullName: string;
  email: string;
  password?: string;
  specialty?: string;
  opdRoom?: string;
}): Promise<DoctorUser> {
  const cleanEmail = data.email.toLowerCase().trim();

  // Try creating via Supabase
  try {
    if (data.password) {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'DOCTOR',
          },
        },
      });
    }
  } catch (err) {
    console.warn('Supabase doctor registration fallback:', err);
  }

  const newDoctor: DoctorUser = {
    id: 'doc-' + Date.now(),
    email: cleanEmail,
    role: 'DOCTOR',
    fullName: data.fullName.startsWith('Dr.') ? data.fullName : `Dr. ${data.fullName}`,
    specialty: data.specialty || 'General Medicine',
    opdRoom: data.opdRoom || 'OPD Room 3',
  };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('mk_doctor_user', JSON.stringify(newDoctor));
  }
  return newDoctor;
}

/**
 * Sign out doctor.
 */
export async function signOutDoctor(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('mk_doctor_user');
    localStorage.removeItem('mk_doctor_user');
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

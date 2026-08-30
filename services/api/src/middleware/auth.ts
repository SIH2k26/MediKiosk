import { Request, Response, NextFunction } from 'express';
import { createSupabaseServerClient } from '../utils/supabase';
import { createUnauthorizedError, createForbiddenError } from './errorHandler';
import { UserRole } from '@medikiosk/shared-types';

// Extend Express Request locals to carry auth state
// This avoids the express-serve-static-core module augmentation issue
export interface AuthLocals {
  userId: string;
  userRole: UserRole;
}

export type AuthRequest = Request & {
  userId?: string;
  userRole?: UserRole;
};


/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches userId and userRole to the request.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        const authReq = req as AuthRequest;
        authReq.userId = user.id;

        // Retrieve role from database profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        authReq.userRole = (profile?.role as UserRole) ?? 'DOCTOR';
        return next();
      }
    }

    // Development mode fallback for local testing
    if (process.env.NODE_ENV !== 'production') {
      const authReq = req as AuthRequest;
      authReq.userId = authReq.userId ?? '00000000-0000-0000-0000-000000000001';
      authReq.userRole = authReq.userRole ?? 'DOCTOR';
      return next();
    }

    return next(createUnauthorizedError());
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      const authReq = req as AuthRequest;
      authReq.userId = '00000000-0000-0000-0000-000000000001';
      authReq.userRole = 'DOCTOR';
      return next();
    }
    next(err);
  }
}

/**
 * Optional authentication middleware.
 * Attaches userId and userRole if a valid bearer token is present, but allows unauthenticated requests through.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const authReq = req as AuthRequest;
        authReq.userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        authReq.userRole = (profile?.role as UserRole) ?? 'PATIENT';
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * Factory to create a middleware that requires specific roles.
 * Usage: router.get('/queue', requireRole(['DOCTOR', 'TRIAGE_STAFF']), handler)
 */
export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.userId || !authReq.userRole) {
      return next(createUnauthorizedError());
    }
    if (!roles.includes(authReq.userRole)) {
      return next(createForbiddenError());
    }
    next();
  };
}


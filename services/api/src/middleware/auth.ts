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
    if (!authHeader?.startsWith('Bearer ')) {
      return next(createUnauthorizedError());
    }

    const token = authHeader.slice(7);
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(createUnauthorizedError());
    }

    (req as AuthRequest).userId = user.id;
    (req as AuthRequest).userRole = (user.user_metadata?.role as UserRole) ?? 'PATIENT';

    next();
  } catch (err) {
    next(err);
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


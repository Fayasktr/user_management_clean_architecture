import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authTypes';
import { UserRole } from '../../../domain/entities/User';

export const requireRole = (allowedRole: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (req.user.role !== allowedRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires '${allowedRole}' role.`,
        },
      });
      return;
    }

    next(); 
  };
};
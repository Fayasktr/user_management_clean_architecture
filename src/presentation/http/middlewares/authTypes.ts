import { Request } from 'express';
import { UserRole } from '../../../domain/entities/User';

export interface AuthenticatedUserPayload {
  userId: string;
  userName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
}
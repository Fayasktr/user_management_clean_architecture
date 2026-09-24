import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../infrastructure/config/dotenv';
import { AuthenticatedRequest, AuthenticatedUserPayload } from './authTypes';

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Access token missing or invalid format' },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;

    req.user = decoded;
    next(); 
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token is invalid or expired' },
    });
    return;
  }
};
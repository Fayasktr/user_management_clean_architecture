import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any,_req: Request,res: Response,_next: NextFunction): void => {

  const errorMessage = err.message || 'Internal Server Error';

  switch (errorMessage) {
    case 'USER_ALREADY_EXISTS':
      res.status(409).json({
        success: false,
        error: { code: 'USER_ALREADY_EXISTS', message: 'Username is already taken' },
      });
      break;

    case 'INVALID_CREDENTIALS':
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      });
      break;

    case 'ACCOUNT_INACTIVE':
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated' },
      });
      break;

    case 'USER_NOT_FOUND':
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
      break;

    default:
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: errorMessage },
      });
      break;
  }
};
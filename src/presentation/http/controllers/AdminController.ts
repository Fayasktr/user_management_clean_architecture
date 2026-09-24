import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../../../application/services/AdminService';
import { UserStatus } from '../../../domain/entities/User';
import { publishUserEvent } from '../../../infrastructure/messaging/rabbitmq';

export class AdminController {
  constructor(private adminService: AdminService) {}

  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as UserStatus | undefined;

      const result = await this.adminService.getAllUsers({ page, limit, status });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.adminService.getUserById(id.toString());

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: "Status must be 'ACTIVE' or 'INACTIVE'" }
        });
        return;
      }

      const updatedUser = await this.adminService.updateUserStatus(id.toString(), status);

      publishUserEvent('USER_STATUS_UPDATED', updatedUser);

      res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  };
}
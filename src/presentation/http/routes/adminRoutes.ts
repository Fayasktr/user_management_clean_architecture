import { Router } from 'express';
import { prisma } from '../../../infrastructure/config/sql';
import { PrismaUserRepository } from '../../../infrastructure/database/prisma/PrismaRepository';
import { AdminService } from '../../../application/services/AdminService';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

const userRepo = new PrismaUserRepository(prisma);
const adminService = new AdminService(userRepo);
const adminController = new AdminController(adminService);

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);

export default router;
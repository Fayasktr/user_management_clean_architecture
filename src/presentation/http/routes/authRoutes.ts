import { Router } from 'express';
import { prisma } from '../../../infrastructure/config/sql';
import { PrismaUserRepository } from '../../../infrastructure/database/prisma/PrismaRepository';
import { AuthService } from '../../../application/services/AuthService';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

const userRepo = new PrismaUserRepository(prisma);
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);


router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/logout', authMiddleware, authController.logout);

export default router;
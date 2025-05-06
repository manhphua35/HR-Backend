import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Login route
router.post('/login', (req, res) => authController.login(req, res));

// Refresh token route
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

// Logout route (requires authentication)
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));

// Get all roles
router.get('/roles', (req, res) => authController.getRoles(req, res));

export default router;
import express from 'express';
import { authController } from './auth.module';

const authRoutes = express.Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/verify/email', authController.verifyEmail);
authRoutes.post('/password/forgot', authController.forgotPassword);

authRoutes.get('/refresh', authController.refreshToken);

export default authRoutes;

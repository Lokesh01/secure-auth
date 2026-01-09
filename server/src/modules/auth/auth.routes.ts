import express from 'express';
import { authController } from './auth.module';

const authRoutes = express.Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);

export default authRoutes;

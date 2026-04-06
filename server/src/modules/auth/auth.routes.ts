import express from 'express';
import { authController } from './auth.module';
import { authenticateJWT } from '#common/strategies/jwt.strategy';
import { config } from '../../config/app.config';
import passport from 'passport';

const authRoutes = express.Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/verify/email', authController.verifyEmail);
authRoutes.post('/password/forgot', authController.forgotPassword);
authRoutes.post('/password/reset', authController.resetPassword);
authRoutes.get('/refresh', authController.refreshToken);

// Google OAuth routes
authRoutes.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);
authRoutes.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.APP_ORIGIN}/login?error=oauth_failed`,
    session: false,
  }),
  authController.oAuthCallback
);

// GitHub OAuth routes
authRoutes.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);
authRoutes.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${config.APP_ORIGIN}/login?error=oauth_failed`,
    session: false,
  }),
  authController.oAuthCallback
);

export default authRoutes;

import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';
import { config } from '#config/app.config';
import userModel from '#database/models/user.model';
import { logger } from '#common/utils/logger';

export const setupGoogleStrategy = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: `${config.APP_ORIGIN}/api/v1/auth/google/callback`,
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          const avatar = profile.photos?.[0]?.value;
          const name = profile.displayName;

          if (!email) {
            logger.warn('Google OAuth: No email found in profile');
            return done(null, false, {
              message: 'No email associated with this Google account',
            });
          }

          // 1. Search by googleId first (handles email change case)
          let user = await userModel.findOne({ googleId: profile.id });

          if (user) {
            logger.info(
              `Google OAuth: Existing user found by googleId: ${user._id}`
            );
            return done(null, user);
          }

          // 2. Search by email (auto-link case)
          user = await userModel.findOne({ email });

          if (user) {
            logger.info(
              `Google OAuth: Linking Google to existing account: ${user._id}`
            );
            // link Google to existing account
            user.googleId = profile.id;
            if (!user.avatar) user.avatar = avatar;
            user.isEmailVerified = true;
            await user.save();
            return done(null, user);
          }

          // 3. Create new user
          logger.info(`Google OAuth: Creating new user with email: ${email}`);
          const newUser = await userModel.create({
            name,
            email,
            googleId: profile.id,
            avatar,
            authProvider: 'google',
            isEmailVerified: true, // Google already verified it
          });

          return done(null, newUser);
        } catch (error) {
          logger.error(`Google OAuth error: ${error}`);
          return done(error as Error, false);
        }
      }
    )
  );
};

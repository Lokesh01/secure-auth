import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { config } from '#config/app.config';
import userModel from '#database/models/user.model';
import { logger } from '#common/utils/logger';

const githubClientId =
  config.NODE_ENV === 'production'
    ? config.GITHUB_CLIENT_ID_PROD
    : config.GITHUB_CLIENT_ID;

const githubClientSecret =
  config.NODE_ENV === 'production'
    ? config.GITHUB_CLIENT_SECRET_PROD
    : config.GITHUB_CLIENT_SECRET;

export const setupGithubStrategy = () => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: '/api/v1/auth/github/callback',
        scope: ['user:email'],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: Function
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          const avatar = profile.photos?.[0]?.value;
          const name = profile.displayName || profile.username;

          // handle private GitHub email
          if (!email) {
            logger.warn('GitHub OAuth: No email found in profile');
            return done(null, false, {
              message: 'Please make your GitHub email public to continue',
            });
          }

          // 1. Search by githubId first (handles email change case)
          let user = await userModel.findOne({ githubId: profile.id });

          if (user) {
            logger.info(
              `GitHub OAuth: Existing user found by githubId: ${user._id}`
            );
            return done(null, user);
          }

          // 2. Search by email (auto-link case)
          user = await userModel.findOne({ email });

          if (user) {
            logger.info(
              `GitHub OAuth: Linking GitHub to existing account: ${user._id}`
            );
            // link GitHub to existing account
            user.githubId = profile.id;
            if (!user.avatar) user.avatar = avatar;
            user.isEmailVerified = true;
            await user.save();
            return done(null, user);
          }

          // 3. Create new user
          logger.info(`GitHub OAuth: Creating new user with email: ${email}`);
          const newUser = await userModel.create({
            name,
            email,
            githubId: profile.id,
            avatar,
            authProvider: 'github',
            isEmailVerified: true, // GitHub already verified it
          });

          return done(null, newUser);
        } catch (error) {
          logger.error(`GitHub OAuth error: ${error}`);
          return done(error as Error, false);
        }
      }
    )
  );
};

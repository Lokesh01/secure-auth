import passport from 'passport';
import { setupJwtStrategy } from '#common/strategies/jwt.strategy';
import { setupGithubStrategy } from '../common/strategies/github.strategy';
import { setupGoogleStrategy } from '../common/strategies/google.strategy';

const initializePassport = () => {
  setupJwtStrategy(passport);
  setupGithubStrategy();
  setupGoogleStrategy();
};

initializePassport();
export default passport;

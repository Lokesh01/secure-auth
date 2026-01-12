import { LoginDto, RegisteredDto } from '#common/interface/auth.interface';
import userModel from '#database/models/user.model';
import {
  BadRequestException,
  UnauthorizedException,
} from '#common/utils/catch-errors';
import { ErrorCode } from '#common/enums/error-codes.enum';
import sessionModel from '#database/models/session.model';
import {
  refreshTokenSignOptions,
  RefreshTPayload,
  signJwtToken,
  verifyJwtToken,
} from '#common/utils/jwt';
import { logger } from '#common/utils/logger';
import {
  calculateExpirationDate,
  ONE_DAY_IN_MS,
} from '#common/utils/date-time';
import { config } from '../../config/app.config';
// import VerificationCodeModel from '#database/models/verification.model';
// import { VerificationEnum } from '#common/enums/verification.enums';
// import { fortyFiveMinutesFromNow } from '#common/utils/date-time';

export class AuthService {
  public async register(registerData: RegisteredDto) {
    const { name, email, password } = registerData;

    logger.info(`Registration attempt for email: ${email}`);

    const existingUser = await userModel.exists({ email });

    if (existingUser) {
      logger.warn(
        `Registration failed: User already exists with email: ${email}`
      );
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    logger.info(`Creating new user with email: ${email}`);
    const newUser = await userModel.create({
      name,
      email,
      password,
    });

    // const userId = newUser._id;

    // const verification = await VerificationCodeModel.create({
    //   userId,
    //   type: VerificationEnum.EMAIL_VERIFICATION,
    //   expiresAt: fortyFiveMinutesFromNow(),
    // });
    logger.info(
      `User registered successfully: ${email}, User ID: ${newUser._id}`
    );

    return {
      user: newUser,
    };
  }

  public async login(loginData: LoginDto) {
    const { email, password, userAgent } = loginData;

    logger.info(`Logging attempt for email: ${email}`);

    const user = await userModel.findOne({
      email,
    });

    if (!user) {
      logger.warn(`Login failed: User with email ${email} not found`);
      throw new BadRequestException(
        'Invalid email or password',
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for email ${email}`);
      throw new BadRequestException(
        'Invalid email or password',
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    // Check if the user enable 2fa retuen user= null
    if (user.userPreferences.enable2FA) {
      logger.info(`2FA required for user ID: ${user._id}`);
      return {
        user: null,
        mfarequired: true,
        accessToken: '',
        refreshToken: '',
      };
    }

    logger.info(`Creatning session for user ID: ${user._id}`);
    const session = await sessionModel.create({
      userId: user._id,
      userAgent,
    });

    logger.info(`Signing tokens for user ID: ${user._id}`);
    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    logger.info(`Login successful for user ID: ${user._id}`);
    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  public async refreshToken(refreshToken: string) {
    const { payload } = verifyJwtToken<RefreshTPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await sessionModel.findById(payload.sessionId);
    const now = Date.now();

    if (!session) {
      throw new UnauthorizedException('Session does not exist');
    }

    //already expired need to login again
    if (session.expiredAt.getTime() <= now) {
      throw new UnauthorizedException('Session expired');
    }

    const sessionRequireRefresh =
      session.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

    if (sessionRequireRefresh) {
      session.expiredAt = calculateExpirationDate(
        config.JWT.REFRESH_EXPIRES_IN
      );
      await session.save();
    }

    //rotate token on every refresh
    const newRefreshToken = sessionRequireRefresh
      ? signJwtToken(
          {
            sessionId: session._id,
          },
          refreshTokenSignOptions
        )
      : undefined;

    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session._id,
    });

    logger.info(
      `Refresh token successful, new access token and refresh token issued for session ID: ${session._id}`
    );

    return {
      accessToken,
      newRefreshToken,
    };
  }
}

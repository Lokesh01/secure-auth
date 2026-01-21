import {
  LoginDto,
  RegisteredDto,
  resetPasswordDto,
} from '#common/interface/auth.interface';
import userModel from '#database/models/user.model';
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
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
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  tenMinutesAgo,
} from '#common/utils/date-time';
import { config } from '#config/app.config';
import VerificationCodeModel from '#database/models/verification.model';
import { VerificationEnum } from '#common/enums/verification.enums';
import { sendEmail } from '#mailers/mailer';
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from '#mailers/templates/template';
import { HTTP_STATUS } from '#config/http.config';
import { hashValue } from '#common/utils/bcrypt';

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

    const userId = newUser._id;

    const verification = await VerificationCodeModel.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });

    //sending verification email link
    const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verification.code}`;
    const { data, error } = await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    if (!data?.id) {
      throw new InternalServerException(`${error?.name} ${error?.message}`);
    }

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

    // Check if the user enable 2fa return user= null
    if (user.userPreferences.enable2FA) {
      logger.info(`2FA required for user ID: ${user._id}`);
      return {
        user: null,
        mfarequired: true,
        accessToken: '',
        refreshToken: '',
      };
    }

    logger.info(`Creating session for user ID: ${user._id}`);
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

  public async verifyEmail(code: string) {
    const validCode = await VerificationCodeModel.findOne({
      code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      validCode.userId,
      { isEmailVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      throw new BadRequestException(
        'Unable to verify email address',
        ErrorCode.VALIDATION_ERROR
      );
    }

    await validCode.deleteOne();

    logger.info(`Email verified for user ID: ${updatedUser._id}`);

    return {
      user: updatedUser,
    };
  }

  public async forgotPassword(email: string) {
    const user = await userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    //check mail rate limit is 3 emails per 10 min
    const timeInterval = tenMinutesAgo();
    const maxAttempt = 3;

    const count = await VerificationCodeModel.countDocuments({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      createdAt: { $gt: timeInterval },
    });

    if (count >= maxAttempt) {
      throw new HttpException(
        'Too many password reset requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS
      );
    }

    const expiresAt = anHourFromNow();
    const validCode = await VerificationCodeModel.create({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt,
    });

    const resetLink = `${config.APP_ORIGIN}/reset-password?code=${validCode.code}&exp=${expiresAt.getTime()}`;

    const { data, error } = await sendEmail({
      to: user.email,
      ...passwordResetTemplate(resetLink),
    });

    if (!data?.id) {
      throw new InternalServerException(`${error?.name} ${error?.message}`);
    }

    return {
      url: resetLink,
      emailId: data.id,
    };
  }

  public async resetPassword({ password, verificationCode }: resetPasswordDto) {
    const validCode = await VerificationCodeModel.findOne({
      code: verificationCode,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new NotFoundException('Invalid or expired verification code');
    }

    const hashedPassword = await hashValue(password);

    const updatedUser = await userModel.findByIdAndUpdate(validCode.userId, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new BadRequestException('Unable to update password');
    }

    await validCode.deleteOne();

    await sessionModel.deleteMany({ userId: updatedUser._id });

    return {
      user: updatedUser,
    };
  }

  public async logout(sessionId: string) {
    return await sessionModel.findByIdAndDelete(sessionId);
  }
}

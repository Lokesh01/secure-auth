import { LoginDto, RegisteredDto } from '#common/interface/auth.interface';
import userModel from '#database/models/user.model';
import { BadRequestException } from '#common/utils/catch-errors';
import { ErrorCode } from '#common/enums/error-codes.enum';
import sessionModel from '#database/models/session.model';
import { refreshTokenSignOptions, signJwtToken } from '#common/utils/jwt';
import { logger } from '#common/utils/logger';
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
}

import { Request } from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import {
  BadRequestException,
  UnauthorizedException,
} from '#common/utils/catch-errors';
import userModel from '#database/models/user.model';
import sessionModel from '#database/models/session.model';
import { refreshTokenSignOptions, signJwtToken } from '#common/utils/jwt';

export class MfaService {
  public async generateMfaSetup(req: Request) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authorized');
    }

    if (user.userPreferences.enable2FA) {
      return {
        message: 'MFA already enabled',
      };
    }

    let mfaSecretKey = user.userPreferences.twoFactorSecret;

    if (!mfaSecretKey) {
      const secret = speakeasy.generateSecret({ name: 'Secure-Auth' });
      mfaSecretKey = secret.base32;

      user.userPreferences.twoFactorSecret = mfaSecretKey;
      await user.save();
    }

    const url = speakeasy.otpauthURL({
      secret: mfaSecretKey,
      label: `${user.name}`,
      issuer: 'Secure-Auth',
      encoding: 'base32',
    });

    const qrImageUrl = await qrcode.toDataURL(url);

    return {
      message: 'Scan the QR code or use the setup key',
      secret: mfaSecretKey,
      qrImageUrl,
    };
  }

  public async verifyMfaSetup(req: Request, code: string, secretKey: string) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not authorized');
    }

    if (user.userPreferences.enable2FA) {
      return {
        message: 'MFA is already enabled',
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    const isValid = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    //once mfa setup complete set enable flag to true
    user.userPreferences.enable2FA = true;
    await user.save();

    return {
      message: 'MFA setup completed successfully',
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }

  public async revokeMfa(req: Request) {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('User not Authorized');
    }

    if (!user.userPreferences.enable2FA) {
      return {
        message: 'MFA is not disabled',
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    user.userPreferences.twoFactorSecret = undefined;
    user.userPreferences.enable2FA = false;
    await user.save();

    //delete all sessions user will be logged out from all devices
    await sessionModel.deleteMany({ userId: user._id });

    return {
      message: 'MFA revoked successfully',
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }

  public async verifyMfaForLogin(
    code: string,
    email: string,
    userAgent?: string
  ) {
    const user = await userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (
      !user.userPreferences.enable2FA &&
      !user.userPreferences.twoFactorSecret
    ) {
      throw new UnauthorizedException('MFA is not enabled for this user');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.userPreferences.twoFactorSecret!,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code, please try again');
    }

    //sign access token and refresh token
    const session = await sessionModel.create({
      userId: user._id,
      userAgent,
    });

    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });
    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}

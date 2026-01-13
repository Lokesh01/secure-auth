import { asyncHandler } from '#middlewares/asyncHandler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  loginSchema,
  registerSchema,
  verificationEmailSchema,
} from '#common/validators/auth.validator';
import { HTTP_STATUS } from '#config/http.config';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from '#common/utils/cookies';
import { UnauthorizedException } from '#common/utils/catch-errors';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public register = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const body = registerSchema.parse({ ...req.body });

      const { user } = await this.authService.register(body);

      return res.status(HTTP_STATUS.CREATED).json({
        message: 'User registered successfully',
        data: user,
      });
    }
  );

  public login = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers['user-agent'];
      const body = loginSchema.parse({
        ...req.body,
        userAgent,
      });

      const { user, accessToken, refreshToken, mfaRequired } =
        await this.authService.login(body);

      if (mfaRequired) {
        return res.status(HTTP_STATUS.OK).json({
          message: 'Verify MFA Authentication',
          mfaRequired,
          user,
        });
      }

      return setAuthenticationCookies({
        res,
        accessToken,
        refreshToken,
      })
        .status(HTTP_STATUS.OK)
        .json({
          message: 'Login successful',
          user,
          mfaRequired,
        });
    }
  );

  public refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const refreshToken = req.cookies['refreshToken'] as string | undefined;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token missing');
      }

      const { accessToken, newRefreshToken } =
        await this.authService.refreshToken(refreshToken);

      if (newRefreshToken) {
        res.cookie(
          'refreshToken',
          newRefreshToken,
          getRefreshTokenCookieOptions()
        );
      }

      return res
        .status(HTTP_STATUS.OK)
        .cookie('accessToken', accessToken, getAccessTokenCookieOptions())
        .json({ message: 'Refresh access token successful' });
    }
  );

  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code } = verificationEmailSchema.parse(req.body);
      await this.authService.verifyEmail(code);

      return res.status(HTTP_STATUS.OK).json({
        message: 'Email verified successfully',
      });
    }
  );
}

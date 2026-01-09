import { asyncHandler } from '#middlewares/asyncHandler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from '#common/validators/auth.validator';
import { HTTP_STATUS } from '#config/http.config';
import { setAuthenticationCookies } from '../../common/utils/cookies';

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
}

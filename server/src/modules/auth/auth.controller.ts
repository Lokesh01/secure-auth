import { asyncHandler } from '#middlewares/asyncHandler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerSchema } from '#common/validators/auth.validator';
import { HTTP_STATUS } from '#config/http.config';

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
}

import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/http.config';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { MfaService } from './mfa.service';
import {
  verifyMfaLoginSchema,
  verifyMfaSchema,
} from '../../common/validators/mfa.validator';
import { setAuthenticationCookies } from '../../common/utils/cookies';

export class MfaController {
  private mfaService: MfaService;

  constructor(mfaService: MfaService) {
    this.mfaService = mfaService;
  }

  public generateMfaSetup = asyncHandler(
    async (req: Request, res: Response) => {
      const { secret, qrImageUrl, message } =
        await this.mfaService.generateMfaSetup(req);

      res.status(HTTP_STATUS.OK).json({
        message,
        secret,
        qrImageUrl,
      });
    }
  );

  public verifyMfaSetup = asyncHandler(async (req: Request, res: Response) => {
    const { code, secretKey } = verifyMfaSchema.parse({ ...req.body });

    const { userPreferences, message } = await this.mfaService.verifyMfaSetup(
      req,
      code,
      secretKey
    );

    res.status(HTTP_STATUS.OK).json({
      message,
      userPreferences,
    });
  });

  public revokeMfa = asyncHandler(async (req: Request, res: Response) => {
    const { message, userPreferences } = await this.mfaService.revokeMfa(req);

    res.status(HTTP_STATUS.OK).json({
      message,
      userPreferences,
    });
  });

  public verifyMfaLogin = asyncHandler(async (req: Request, res: Response) => {
    const { code, email, userAgent } = verifyMfaLoginSchema.parse({
      ...req.body,
      userAgent: req.headers['user-agent'],
    });

    const { accessToken, refreshToken, user } =
      await this.mfaService.verifyMfaForLogin(code, email, userAgent);

    setAuthenticationCookies({ res, accessToken, refreshToken })
      .status(HTTP_STATUS.OK)
      .json({
        message: 'verified and login successfully',
        user,
      });
  });
}

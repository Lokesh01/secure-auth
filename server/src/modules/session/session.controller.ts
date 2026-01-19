import { Request, Response } from 'express';
import { asyncHandler } from '#middlewares/asyncHandler';
import { SessionService } from './session.service';
import { HTTP_STATUS } from '#config/http.config';
import { NotFoundException } from '#common/utils/catch-errors';
import z from 'zod';

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }

  public getAllSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    console.log('inside session controller');

    const { sessions } = await this.sessionService.getAllSessions(userId);

    const modifySessions = sessions.map(session => ({
      ...session.toObject(),
      ...(session.id === sessionId && {
        isCurrent: true,
      }),
    }));

    res.status(HTTP_STATUS.OK).json({
      message: 'Retrieved all session successfully',
      sessions: modifySessions,
    });
  });

  public getSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req?.sessionId;

    if (!sessionId) {
      throw new NotFoundException('Session ID not found');
    }

    const { user } = await this.sessionService.getSessionById(sessionId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Session retrieved successfully',
      user,
    });
  });

  public deleteSessionById = asyncHandler(
    async (req: Request, res: Response) => {
      const sessionId = z.string().parse(req.params.id);
      const userId = req?.user?.id;

      await this.sessionService.deleteSessionById(sessionId, userId);

      res.status(HTTP_STATUS.OK).json({
        message: 'Session deleted successfully',
      });
    }
  );
}

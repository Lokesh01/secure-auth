import sessionModel from '#database/models/session.model';
import { NotFoundException } from '#common/utils/catch-errors';

export class SessionService {
  public async getAllSessions(userId: string) {
    const sessions = await sessionModel.find(
      {
        userId,
        expiredAt: { $gt: Date.now() },
      },
      {
        _id: 1,
        userId: 1,
        userAgent: 1,
        createdAt: 1,
        expiredAt: 1,
      },
      {
        sort: {
          createdAt: -1,
        },
      }
    );

    return {
      sessions,
    };
  }

  public async getSessionById(sessionId: string) {
    const session = await sessionModel
      .findById(sessionId)
      .populate('userId')
      .select('-expiresAt');

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const { userId: user } = session;

    return {
      user,
    };
  }

  public async deleteSessionById(sessionId: string, userId: string) {
    //only the session owners can delete their session that's why include userId
    const deletedSession = await sessionModel.findByIdAndDelete({
      _id: sessionId,
      userId,
    });

    if (!deletedSession) {
      throw new NotFoundException('Session not found');
    }

    return;
  }
}

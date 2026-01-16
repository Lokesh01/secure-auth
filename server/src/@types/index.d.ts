import { UserDocument } from '#database/models/user.model';

declare global {
  namespace Express {
    // Extend Express.User with your UserDocument type
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserDocument {}
    interface Request {
      sessionId?: string;
    }
  }
}

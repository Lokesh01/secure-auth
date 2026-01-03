import { RegisteredDto } from '#common/interface/auth.interface';
import userModel from '#database/models/user.model';
import { BadRequestException } from '#common/utils/catch-errors';
import { ErrorCode } from '#common/enums/error-codes.enum';

export class AuthService {
  public async register(registerData: RegisteredDto) {
    const { name, email, password } = registerData;

    const existingUser = await userModel.exists({ email });

    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const newUser = await userModel.create({
      name,
      email,
      password,
    });

    const userId = newUser._id;

    // const verification = await VerificationCodeModel.create({
    //   userId,
    //   type: VerificationEnum.EMAIL_VERIFICATION,
    // });

    return {
      user: newUser,
    };
  }
}

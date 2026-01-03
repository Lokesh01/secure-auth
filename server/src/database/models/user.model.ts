import mongoose, { Document } from 'mongoose';
import { comparePassword, hashValue } from '#common/utils/bcrypt';

interface UserPreferences {
  enable2FA: boolean;
  emailNotifications: boolean;
  twoFactorSecret?: string;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  userPreferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(value: string): Promise<boolean>;
}

const userPreferencesSchema = new mongoose.Schema<UserPreferences>({
  enable2FA: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  twoFactorSecret: { type: String, default: null },
});

const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    userPreferences: { type: userPreferencesSchema, default: () => ({}) },
  },
  { timestamps: true, toJSON: {} } //toJSON:{} constructore to enable custom toJSON method
);

userSchema.pre('save', async function (this: UserDocument, next) {
  if (this.isModified('password')) {
    this.password = await hashValue(this.password);
  }
  next();
});

userSchema.methods.comparePassword = async function (value: string) {
  return comparePassword(value, this.password);
};

//remove sensitive fields when converting to JSON works internally when sending response
userSchema.set('toJSON', {
  transform(doc, ret: any) {
    delete ret.password;
    delete ret.userPreferences.twoFactorSecret;
    return ret;
  },
});

const userModel = mongoose.model<UserDocument>('User', userSchema);

export default userModel;

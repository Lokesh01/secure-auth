import mongoose from 'mongoose';
import { VerificationEnum } from '#common/enums/verification.enums';
import { generateUniqueCode } from '#common/utils/uuid';

export interface VerificationCodeDocument extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  type: VerificationEnum;
  expiresAt: Date;
  createdAt: Date;
}

const verificationCodeSchema = new mongoose.Schema<VerificationCodeDocument>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    default: generateUniqueCode,
  },
  type: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const VerificationCodeModel = mongoose.model<VerificationCodeDocument>(
  'VerificationCode',
  verificationCodeSchema,
  'verification_codes'
);

export default VerificationCodeModel;

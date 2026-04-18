import { z } from 'zod';

export const emailSchema = z.string().trim().email().min(1).max(255);

export const passwordSchema = z
  .string()
  .trim()
  .min(8, 'Password must be at least 8 characters')
  .max(255, 'Password must be less than 255 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

export const verificationCodeSchema = z.string().trim().min(1).max(25);

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(val => val.password === val.confirmPassword, {
    message: 'Passwords does not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .trim()
    .min(1, 'Password is required')
    .max(255, 'Password is too long'),
  userAgent: z.string().optional(),
});

export const verificationEmailSchema = z.object({
  code: verificationCodeSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});

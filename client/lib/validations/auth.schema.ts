import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address');

export const passwordSchema = z
  .string()
  .trim()
  .min(8, 'Password must be at least 8 characters')
  .max(255, 'Password too long')
  .regex(/[A-Z]/, 'Must contain one uppercase letter')
  .regex(/[0-9]/, 'Must contain one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain one special character');

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .trim()
    .min(1, 'Password is required')
    .max(255, 'Password is too long'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

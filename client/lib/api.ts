import API from './axios-client';

type LoginType = {
  email: string;
  password: string;
};

type RegisterType = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type VerifyEmailType = {
  code: string;
};

type VerifyMFAType = {
  code: string;
  secretKey: string;
};

type MFALoginType = {
  code: string;
  email: string;
};

type ForgotPasswordType = {
  email: string;
};

type ResetPasswordType = {
  password: string;
  verificationCode: string;
};

type SessionType = {
  _id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SessionResponseType = {
  message: string;
  sessions: sessionType[];
};

export type MfaType = {
  message: string;
  secret: string;
  qrImageUrl: string;
};

export const loginMutationFn = async (data: LoginType) =>
  await API.post('/auth/login', data);

export const registerMutationFn = async (data: RegisterType) =>
  await API.post('/auth/register', data);

export const verifyEmailMutationFn = async (data: VerifyEmailType) =>
  await API.post('/auth/verify/email', data);

export const forgotPasswordMutationFn = async (data: ForgotPasswordType) =>
  await API.post('/auth/password/forgot', data);

export const resetPasswordMutationFn = async (data: ResetPasswordType) =>
  await API.post('/auth/password/reset', data);

export const verifyMFALoginMutationFn = async (data: MFALoginType) =>
  await API.post('/mfa/verify-login', data);

export const logoutMutationFn = async () => await API.post('/auth/logout');

export const mfaSetupQueryFn = async () => {
  const response = await API.get<MfaType>('/mfa/setup');
  return response.data;
};

export const verifyMfaMutationFn = async (data: VerifyMFAType) =>
  await API.post('/mfa/verify', data);

export const revokeMfaMutationFn = async () => await API.put('/mfa/revoke', {});

export const getUserSeesionQueryFn = async () => {
  await API.get('/sessions/');
};

export const sessionQueryFn = async () => {
  const response = await API.get<SessionResponseType>('/sessions/all');
  return response.data;
};

export const sessionDeleteMutationFn = async (sessionId: string) =>
  await API.delete(`/sessions/${sessionId}`);

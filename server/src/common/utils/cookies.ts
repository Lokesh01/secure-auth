import { CookieOptions, Response } from 'express';
import { config } from '#config/app.config';
import { calculateExpirationDate } from './date-time';

type CookiePayloadType = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`;

const defaults: CookieOptions = {
  httpOnly: true,
  // 'secure' must be true when sameSite is 'none'
  secure: config.NODE_ENV === 'production' ? true : false,
  // In production, frontend and backend are on different subdomains of onrender.com
  // which is on the Public Suffix List, so browsers treat them as completely separate sites.
  // This means we can't use 'strict' or 'lax' as cookies would be blocked on cross-origin requests.
  // 'none' is required for cross-origin cookies but needs 'secure: true'.
  // Ideal fix: use a custom domain with 'lax' + domain: '.mycompany.com'
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
};
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.REFRESH_EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);

  return {
    ...defaults,
    expires,
    path: REFRESH_PATH,
  };
};

export const getAccessTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);

  return {
    ...defaults,
    expires,
    path: '/',
  };
};

//cookie(name, value, options)
export const setAuthenticationCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookiePayloadType): Response =>
  res
    .cookie('accessToken', accessToken, getAccessTokenCookieOptions())
    .cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

export const clearAuthenticationCookies = (res: Response): Response =>
  res
    .clearCookie('accessToken')
    .clearCookie('refreshToken', { path: REFRESH_PATH });

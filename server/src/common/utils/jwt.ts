import { UserDocument } from '#database/models/user.model';
import { SessionDocument } from '#database/models/session.model';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { config } from '#config/app.config';

export type AccessTPayload = {
  userId: UserDocument['_id'];
  sessionId: SessionDocument['_id'];
};

export type RefreshTPayload = {
  sessionId: SessionDocument['_id'];
};

type SignOptsAndSecret = SignOptions & {
  secret: string;
};

/**
 * Default options for signing JWTs
 * Note: SignOptions accepts audience as string[] (simple array)
 */
const signDefaults: SignOptions = {
  audience: [config.JWT.AUDIENCE] as [string], // Cast to tuple for type safety
};

/**
 * Default options for verifying JWTs
 * Note: VerifyOptions requires audience as a tuple [string | RegExp, ...(string | RegExp)[]]
 * This means "at least one element" - empty arrays are not allowed
 * We need separate defaults because SignOptions and VerifyOptions have incompatible audience types
 */
const verifyDefaults: VerifyOptions = {
  // Tuple syntax: [first required element, ...optional rest elements]
  audience: [config.JWT.AUDIENCE] as [string | RegExp, ...(string | RegExp)[]],
};

export const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: config.JWT.EXPIRES_IN, // StringValue type from 'ms' package (e.g., '15m', '1h', '7d')
  secret: config.JWT.SECRET,
};

export const refreshTokenSignOptions: SignOptsAndSecret = {
  expiresIn: config.JWT.REFRESH_EXPIRES_IN, // StringValue type from 'ms' package
  secret: config.JWT.REFRESH_SECRET,
};

/**
 * Signs a JWT token with the provided payload
 * @param payload - User and session information to encode in the token
 * @param options - Optional signing options (defaults to accessTokenSignOptions)
 * @returns Signed JWT string
 */
export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options?: SignOptsAndSecret
) => {
  const { secret, ...opts } = options || accessTokenSignOptions;

  return jwt.sign(payload, secret, {
    ...signDefaults, // Spreads default audience for signing
    ...opts,
  });
};

/**
 * Verifies a JWT token and returns the decoded payload
 * @param token - JWT string to verify
 * @param options - Optional verification options
 * @returns Object with either payload or error message
 */
export const verifyJwtToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options?: VerifyOptions & { secret: string }
) => {
  try {
    const { secret = config.JWT.SECRET, ...opts } = options || {};

    // jwt.verify() returns Jwt | JwtPayload | string
    // We use double assertion (as unknown as TPayload) because:
    // 1. Direct cast to TPayload fails (string is not compatible with object)
    // 2. Cast to 'unknown' first, then to TPayload is the TypeScript escape hatch
    const payload = jwt.verify(token, secret, {
      ...verifyDefaults, // Spreads default audience for verification
      ...opts,
    }) as unknown as TPayload;

    return { payload };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

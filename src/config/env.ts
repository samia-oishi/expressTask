import "dotenv/config";

function getRequiredJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  return secret;
}

function parseJwtExpiry(value: string | undefined) {
  const expiry = value ?? "15m";
  const match = /^(\d+)(s|m|h|d)$/.exec(expiry);

  if (!match) {
    throw new Error("JWT_EXPIRES_IN must use a value such as 15m, 1h, or 1d");
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;

  if (!Number.isSafeInteger(amount) || amount <= 0 || !unit) {
    throw new Error("JWT_EXPIRES_IN must be a positive duration");
  }

  return amount * multipliers[unit as keyof typeof multipliers];
}

const port = Number(process.env.PORT) || 5000;

export const env = {
  jwtSecret: getRequiredJwtSecret(),
  jwtExpiresInSeconds: parseJwtExpiry(process.env.JWT_EXPIRES_IN),
  jwtIssuer: process.env.JWT_ISSUER ?? "express-task-api",
  jwtAudience: process.env.JWT_AUDIENCE ?? "express-task-client",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  smtpUser: process.env.SMTP_USER?.trim(),
  smtpAppPassword: process.env.SMTP_APP_PASSWORD?.replace(/\s/g, ""),
  appBaseUrl: process.env.APP_BASE_URL ?? `http://localhost:${port}`,
} as const;

if (
  !Number.isInteger(env.bcryptSaltRounds) ||
  env.bcryptSaltRounds < 10 ||
  env.bcryptSaltRounds > 15
) {
  throw new Error("BCRYPT_SALT_ROUNDS must be an integer between 10 and 15");
}

if (Boolean(env.smtpUser) !== Boolean(env.smtpAppPassword)) {
  throw new Error("SMTP_USER and SMTP_APP_PASSWORD must be configured together");
}

try {
  new URL(env.appBaseUrl);
} catch {
  throw new Error("APP_BASE_URL must be a valid absolute URL");
}


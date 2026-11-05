import { createHash, randomBytes } from "node:crypto";

export function hashSecurityToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSecurityToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashSecurityToken(token) };
}

export function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

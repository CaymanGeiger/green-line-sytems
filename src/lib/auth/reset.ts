import { createHmac, randomInt } from "node:crypto";

import { env } from "@/lib/env";

export const PASSWORD_RESET_CODE_LENGTH = 6;
export const PASSWORD_RESET_TTL_MINUTES = 10;
export const PASSWORD_RESET_MAX_ATTEMPTS = 8;

function getResetCodeSecret() {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set and at least 32 characters.");
  }

  return secret;
}

export function generateResetCode(): string {
  let code = "";
  for (let i = 0; i < PASSWORD_RESET_CODE_LENGTH; i += 1) {
    code += String(randomInt(0, 10));
  }

  return code;
}

export function hashResetCode(code: string): string {
  return createHmac("sha256", getResetCodeSecret()).update(code).digest("hex");
}

export function isValidResetCodeFormat(code: string): boolean {
  return new RegExp(`^\\d{${PASSWORD_RESET_CODE_LENGTH}}$`).test(code);
}

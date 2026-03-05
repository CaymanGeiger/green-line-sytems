import { compare as compareWithNativeBcrypt, hash as hashWithNativeBcrypt } from "@node-rs/bcrypt";
import bcryptjs from "bcryptjs";

const SPECIAL_CHAR_REGEX = /[!?@#$]/;
const UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_HASH_ROUNDS = 12;
let warnedNativeFallback = false;

function warnNativeFallback(error: unknown) {
  if (warnedNativeFallback) {
    return;
  }

  warnedNativeFallback = true;
  console.warn("Native bcrypt unavailable, falling back to bcryptjs", error);
}

export type PasswordValidation = {
  valid: boolean;
  issues: string[];
};

export const PASSWORD_REQUIREMENTS = [
  "Must be at least 8 characters.",
  "Must include at least one uppercase letter.",
  "Must include at least one special character (! ? @ # $).",
] as const;

export function validatePasswordPolicy(password: string): PasswordValidation {
  const issues: string[] = [];

  if (password.length < 8) {
    issues.push(PASSWORD_REQUIREMENTS[0]);
  }

  if (!UPPERCASE_REGEX.test(password)) {
    issues.push(PASSWORD_REQUIREMENTS[1]);
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    issues.push(PASSWORD_REQUIREMENTS[2]);
  }

  return { valid: issues.length === 0, issues };
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await hashWithNativeBcrypt(password, PASSWORD_HASH_ROUNDS);
  } catch (error) {
    warnNativeFallback(error);
    return bcryptjs.hash(password, PASSWORD_HASH_ROUNDS);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await compareWithNativeBcrypt(password, hash);
  } catch (error) {
    warnNativeFallback(error);
    return bcryptjs.compare(password, hash);
  }
}

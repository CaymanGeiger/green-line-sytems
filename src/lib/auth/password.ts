import bcrypt from "bcryptjs";

const SPECIAL_CHAR_REGEX = /[!?@#$]/;
const UPPERCASE_REGEX = /[A-Z]/;

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
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

import * as argon2 from "argon2";
import { AUTH_ERROR_CODES } from "@pitchdeck/contracts";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export function validatePasswordLength(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthValidationError(
      AUTH_ERROR_CODES.VALIDATION_ERROR,
      `Password must be at least ${String(PASSWORD_MIN_LENGTH)} characters`,
    );
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new AuthValidationError(
      AUTH_ERROR_CODES.VALIDATION_ERROR,
      `Password must be at most ${String(PASSWORD_MAX_LENGTH)} characters`,
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordLength(password);
  return argon2.hash(password, ARGON2_OPTIONS) as Promise<string>;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export class AuthValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthValidationError";
  }
}

import bcrypt from "bcryptjs";

/**
 * Password hashing with bcryptjs — a pure-JS implementation (no native addon),
 * so the server bundles and runs under Electron's Node without an ABI rebuild.
 * Fast enough for staff logins; never store the plain PIN/password.
 */
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

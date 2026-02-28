import bcrypt from 'bcryptjs';

const HARDCODED_PASSWORD = 'opsdb2026';

export async function checkPassword(password: string): Promise<boolean> {
  const hashEnv = process.env.AUTH_PASSWORD_HASH;
  if (hashEnv) {
    return bcrypt.compare(password, hashEnv);
  }
  // Fallback to hardcoded for dev
  return password === HARDCODED_PASSWORD;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

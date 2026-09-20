import crypto from 'node:crypto';
import fs from 'node:fs';

// Before anything reads process.env. A variable already set in the shell wins over the file.
if (fs.existsSync('.env')) process.loadEnvFile('.env');

const COOKIE = 'quest_auth';
const MAX_AGE_S = 60 * 60 * 24 * 7;

const password = () => process.env.ADMIN_PASSWORD || '12306';

// Derived from the password, so nothing is stored and changing the password signs everyone out.
const token = () => crypto.createHmac('sha256', password()).update('qoder-quest').digest('hex');

function same(a: string, b: string): boolean {
  const [x, y] = [a, b].map((s) => crypto.createHash('sha256').update(s).digest());
  return crypto.timingSafeEqual(x, y);
}

export const passwordOk = (given: unknown): boolean => typeof given === 'string' && same(given, password());

export function authed(cookieHeader: string | undefined): boolean {
  const value = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === COOKIE)?.[1];
  return value !== undefined && same(value, token());
}

export function loginCookie(secure: boolean): string {
  return `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure ? '; Secure' : ''}`;
}

export const logoutCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

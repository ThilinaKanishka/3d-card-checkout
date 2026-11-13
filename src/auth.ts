/**
 * Client-side demo authentication.
 *
 * ⚠️  DEMO ONLY — DO NOT USE THIS PATTERN IN PRODUCTION.
 * Everything here runs in the browser, so anyone can read or edit the stored
 * users, and any script on the page can read localStorage. A real app needs a
 * proper backend for auth: passwords sent over HTTPS, hashed server-side with a
 * slow, memory-hard algorithm (Argon2id, scrypt or bcrypt — not a single
 * SHA-256), and sessions held in HttpOnly, Secure cookies.
 *
 * What this demo does do:
 * - never stores the plain password: it saves a random 16-byte salt and
 *   SHA-256(salt + password), computed with the Web Crypto API;
 * - keeps the session in localStorage ("Remember me") or sessionStorage.
 */

export interface User {
  name: string;
  email: string;
}

interface StoredUser extends User {
  /** Hex-encoded random salt. */
  salt: string;
  /** Hex-encoded SHA-256(salt bytes + UTF-8 password bytes). */
  passwordHash: string;
  createdAt: string;
}

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

const USERS_KEY = 'novapay.users';
const SESSION_KEY = 'novapay.session';
const SALT_BYTES = 16;

// ───────────────────────── Hashing ─────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** SHA-256 over the salt followed by the UTF-8 password. */
async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password);
  const data = new Uint8Array(salt.length + passwordBytes.length);
  data.set(salt);
  data.set(passwordBytes, salt.length);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

/** Web Crypto's `subtle` is only available in secure contexts (https or localhost). */
function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

const CRYPTO_ERROR = 'Secure crypto is unavailable. Open the app over https or on localhost.';

// ───────────────────────── Storage ─────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value.name === 'string' && typeof value.email === 'string';
}

function isStoredUser(value: unknown): value is StoredUser {
  return (
    isUser(value) &&
    isRecord(value) &&
    typeof value.salt === 'string' &&
    typeof value.passwordHash === 'string' &&
    typeof value.createdAt === 'string'
  );
}

/** Reads and parses JSON from storage, returning null on any failure (blocked storage, bad JSON…). */
function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the demo simply won't persist.
  }
}

function removeKey(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore blocked storage.
  }
}

function readUsers(): StoredUser[] {
  const data = readJson(localStorage, USERS_KEY);
  return Array.isArray(data) ? data.filter(isStoredUser) : [];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findUser(email: string): StoredUser | undefined {
  const normalized = normalizeEmail(email);
  return readUsers().find((user) => user.email === normalized);
}

// ───────────────────────── Session ─────────────────────────

/** Stores the session in localStorage (remember) or sessionStorage (this tab only). */
function startSession(user: User, remember: boolean): void {
  logOut();
  const session: User = { name: user.name, email: user.email };
  writeJson(remember ? localStorage : sessionStorage, SESSION_KEY, session);
}

/** Returns the signed-in user, or null. Sessions for deleted users are discarded. */
export function getCurrentUser(): User | null {
  const session = readJson(localStorage, SESSION_KEY) ?? readJson(sessionStorage, SESSION_KEY);
  if (!isUser(session)) return null;

  const stored = findUser(session.email);
  if (!stored) {
    logOut();
    return null;
  }
  return { name: stored.name, email: stored.email };
}

/** Clears the session from both storages. */
export function logOut(): void {
  removeKey(localStorage, SESSION_KEY);
  removeKey(sessionStorage, SESSION_KEY);
}

// ───────────────────────── Public API ─────────────────────────

/** Registers a new user and signs them in for this tab. */
export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  if (!cryptoAvailable()) return { ok: false, error: CRYPTO_ERROR };

  const normalized = normalizeEmail(email);
  if (findUser(normalized)) return { ok: false, error: 'Email already registered' };

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const user: StoredUser = {
    name: name.trim().replace(/\s+/g, ' '),
    email: normalized,
    salt: toHex(salt),
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  writeJson(localStorage, USERS_KEY, [...readUsers(), user]);
  startSession(user, false);
  return { ok: true, user: { name: user.name, email: user.email } };
}

/** Checks the credentials and starts a session. */
export async function logIn(email: string, password: string, remember: boolean): Promise<AuthResult> {
  if (!cryptoAvailable()) return { ok: false, error: CRYPTO_ERROR };

  const user = findUser(email);
  // Same message whether the email or the password is wrong, so emails can't be probed.
  const failure: AuthResult = { ok: false, error: 'Incorrect email or password' };
  if (!user) return failure;

  const hash = await hashPassword(password, fromHex(user.salt));
  if (hash !== user.passwordHash) return failure;

  startSession(user, remember);
  return { ok: true, user: { name: user.name, email: user.email } };
}

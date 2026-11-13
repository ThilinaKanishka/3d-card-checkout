/**
 * Password strength scoring for the sign-up meter.
 */

export interface StrengthChecks {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
}

/** 0 = empty, 1 = weak, 2 = fair, 3 = strong, 4 = very strong. */
export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  checks: StrengthChecks;
  level: StrengthLevel;
  label: '' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
}

const LABELS: Record<StrengthLevel, StrengthResult['label']> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Very strong',
};

/** Scores a password by how many of the four checks it meets. */
export function getPasswordStrength(password: string): StrengthResult {
  const checks: StrengthChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
  };

  let level: StrengthLevel = 0;
  if (password.length > 0) {
    const met = Object.values(checks).filter(Boolean).length;
    // A short password can be "fair" at best, however varied it is.
    const capped = checks.length ? met : Math.min(met, 2);
    level = Math.max(1, capped) as StrengthLevel;
  }

  return { checks, level, label: LABELS[level] };
}

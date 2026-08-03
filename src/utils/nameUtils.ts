/** Nume = lastName, Prenume = firstName. Display: "Prenume Nume". */

export function composeDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

/**
 * Split a legacy single fullName for the form.
 * First token → Prenume, remaining → Nume (e.g. "Maria Popescu" → Maria / Popescu).
 */
export function splitDisplayName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function resolvePersonName(data: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): { firstName: string; lastName: string; fullName: string } {
  const hasSplit =
    (typeof data.firstName === 'string' && data.firstName.trim()) ||
    (typeof data.lastName === 'string' && data.lastName.trim());

  if (hasSplit) {
    const firstName = (data.firstName || '').trim();
    const lastName = (data.lastName || '').trim();
    return {
      firstName,
      lastName,
      fullName: composeDisplayName(firstName, lastName) || (data.fullName || '').trim(),
    };
  }

  const legacy = (data.fullName || '').trim();
  const split = splitDisplayName(legacy);
  return {
    firstName: split.firstName,
    lastName: split.lastName,
    fullName: legacy || composeDisplayName(split.firstName, split.lastName),
  };
}

/** Format phone digits as XXX XXX XXX (max 9). */
export function formatPhoneDigitsInput(raw: string): string {
  const limitedDigits = raw.replace(/\D/g, '').slice(0, 9);
  if (limitedDigits.length > 6) {
    return `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
  }
  if (limitedDigits.length > 3) {
    return `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
  }
  return limitedDigits;
}

export function toE164RoPhone(digitsFormatted: string): string {
  return `+40${digitsFormatted.replace(/\D/g, '')}`;
}

export function stripRoPhonePrefix(phone: string): string {
  return phone.replace(/^\+40\s?/, '').trim();
}

export function isValidRoPhoneDigits(digitsFormatted: string): boolean {
  return digitsFormatted.replace(/\D/g, '').length === 9;
}

export function toDateInputValue(date?: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

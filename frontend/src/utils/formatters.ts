/**
 * Formats integer paise into Indian Rupee currency string.
 * Example: 150000 -> "₹1,500.00", -150000 -> "-₹1,500.00"
 */
export function formatPaise(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return '₹0.00';
  
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  
  // Format rupees with Indian numbering system (lakhs, crores)
  const rupeesStr = rupees.toLocaleString('en-IN');
  const paiseStr = remainderPaise.toString().padStart(2, '0');
  
  const formatted = `₹${rupeesStr}.${paiseStr}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converts decimal rupees string or number to integer paise.
 * Example: "150.50" -> 15050, 100 -> 10000
 */
export function rupeesToPaise(rupees: string | number): number {
  if (typeof rupees === 'number') {
    return Math.round(rupees * 100);
  }
  const clean = rupees.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Generates an RFC 4122 v4 UUID for the Idempotency-Key header.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats ISO timestamps into human-readable date & time.
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}


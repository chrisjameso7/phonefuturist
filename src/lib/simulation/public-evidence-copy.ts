/**
 * Presentation-only redaction of calibration publisher names.
 * Do not apply this to the measurement registry, audit logs or source metadata.
 * Full provenance must remain available for internal validation and licensing.
 */
export function publicEvidenceText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\b(?:DXO\s?Mark|GSMArena|Geekerwan|SOCPK|PhoneArena|NanoReview|TechAPI)\b/gi, 'independent measurement data')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[reference retained internally]');
}

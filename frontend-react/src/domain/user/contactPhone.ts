/** Presentation-friendly syntax validation; backend numbering-plan validation remains authoritative. */
export function isInternationalPhoneInput(value: string): boolean {
  const phone = value.trim();
  return /^\+[0-9 ()-]+$/.test(phone) && /^\+[1-9][0-9]{6,14}$/.test(phone.replace(/[ ()-]/g, ""));
}

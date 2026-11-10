import { useState } from "react";
import { joinContactPhone, splitContactPhone, type PhoneCountry, type PhoneLine } from "@/domain/user/phoneCountry";

/**
 * Stores country selection separately so an empty input never resets the user's choice.
 * Personal contact phones are always mobiles; business numbers may opt into landlines.
 */
export function usePhoneNumberField(initialValue: string, onChange: (value: string) => void, allowLandline = false) {
  const [parts, setParts] = useState(() => {
    const split = splitContactPhone(initialValue);
    return { ...split, line: allowLandline ? split.line : "mobile" as PhoneLine };
  });
  const update = (country: PhoneCountry, national: string, line: PhoneLine) => {
    const pasted = national.trim().startsWith("+") && country !== "OTHER";
    const split = pasted ? splitContactPhone(national) : undefined;
    const next = split ? { ...split, line: allowLandline ? split.line : "mobile" as PhoneLine } : { country, national, line };
    setParts(next);
    onChange(joinContactPhone(next.country, next.national, next.line));
  };
  return { ...parts, showLine: allowLandline && parts.country === "AR",
    setCountry: (country: PhoneCountry) => update(country, parts.national, parts.line),
    setNational: (national: string) => update(parts.country, national, parts.line),
    setLine: (line: PhoneLine) => update(parts.country, parts.national, line) };
}

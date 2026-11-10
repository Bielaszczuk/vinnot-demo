import { useState } from "react";
import { joinContactPhone, splitContactPhone, type PhoneCountry } from "@domain/user/phoneCountry";

/** Stores country selection separately so an empty input never resets the user's choice. */
export function usePhoneNumberField(initialValue: string, onChange: (value: string) => void) {
  const [parts, setParts] = useState(() => splitContactPhone(initialValue));
  const update = (country: PhoneCountry, national: string) => {
    const next = national.trim().startsWith("+") && country !== "OTHER"
      ? splitContactPhone(national) : { country, national };
    setParts(next);
    onChange(joinContactPhone(next.country, next.national));
  };
  return { ...parts, setCountry: (country: PhoneCountry) => update(country, parts.national),
    setNational: (national: string) => update(parts.country, national) };
}

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { phoneCountries, type PhoneCountry } from "@domain/user/phoneCountry";
import { usePhoneNumberField } from "@hooks/usePhoneNumberField";

export function PhoneNumberField({ value, onChange, disabled }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const phone = usePhoneNumberField(value, onChange);
  const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-wine-500 focus:ring-2 focus:ring-wine-500/20";
  return <fieldset disabled={disabled} className="space-y-2">
    <legend className="text-sm font-medium text-gray-700">{t("contactPhone.label")}</legend>
    <div className="flex gap-2">
      <select className={`${inputClass} max-w-32`} aria-label={t("contactPhone.country")}
        value={phone.country} onChange={e => phone.setCountry(e.target.value as PhoneCountry)}>
        {phoneCountries.map(c => <option key={c.code} value={c.code}>{c.code} +{c.dial}</option>)}
        <option value="OTHER">{t("contactPhone.otherCountry")}</option>
      </select>
      <input className={`${inputClass} min-w-0`} type="tel" autoComplete="tel-national" required
        aria-label={t("contactPhone.label")} aria-describedby={id} maxLength={30}
        value={phone.national} onChange={e => phone.setNational(e.target.value)}
        placeholder={phone.country === "AR" ? "11 2345 6789" : undefined} />
    </div>
    <p id={id} className="text-xs text-gray-500">{t(phone.country === "OTHER" ? "contactPhone.hint" : "contactPhone.nationalHint")}</p>
  </fieldset>;
}

package com.vinnot.shared.infrastructure.phone;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.vinnot.shared.application.port.PhoneNumberNormalizer;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.stereotype.Component;
import java.util.Objects;

@Component
public final class LibPhoneNumberNormalizer implements PhoneNumberNormalizer {
    private final PhoneNumberUtil phones = PhoneNumberUtil.getInstance();

    @Override
    public String normalizeOptional(String input) {
        if (Objects.isNull(input) || input.isBlank()) {
            return null;
        }
        String value = input.trim();
        if (value.length() > 50 || !value.matches("\\+[0-9 ()-]+")) {
            throw invalid();
        }
        try {
            var parsed = phones.parse(value, "ZZ");
            if (parsed.hasExtension() || !phones.isValidNumber(parsed)) {
                throw invalid();
            }
            return phones.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException exception) {
            throw invalid();
        }
    }

    private DomainException invalid() {
        return new DomainException("INVALID_PHONE_NUMBER", "Enter a valid phone number including its country calling code");
    }
}

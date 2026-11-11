package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/** Validates the optional bottle barcode (EAN-8, UPC-A, EAN-13 or GTIN-14) sent with a label scan. */
@Component
public class WineLabelBarcodeValidator {

    private static final Pattern ASCII_DIGITS = Pattern.compile("[0-9]+");
    private static final Set<Integer> LENGTHS = Set.of(8, 12, 13, 14);
    private static final int GS1_ODD_WEIGHT = 3;
    private static final int DECIMAL = 10;

    /** @return the barcode, or {@code null} when the client sent none */
    public String validate(String barcode) {
        if (Objects.isNull(barcode)) {
            return null;
        }
        if (!LENGTHS.contains(barcode.length()) || !ASCII_DIGITS.matcher(barcode).matches()
                || !hasValidCheckDigit(barcode)) {
            throw new DomainException("INVALID_LABEL_BARCODE",
                    "The barcode must be 8, 12, 13 or 14 digits with a valid check digit");
        }
        return barcode;
    }

    /** GS1 mod-10: from the right, digits before the check digit weigh 3, 1, 3, ... */
    private static boolean hasValidCheckDigit(String barcode) {
        int sum = 0;
        int last = barcode.length() - 1;
        for (int position = last - 1; position >= 0; position--) {
            int weight = (last - position) % 2 == 1 ? GS1_ODD_WEIGHT : 1;
            sum += Character.digit(barcode.charAt(position), DECIMAL) * weight;
        }
        return (DECIMAL - sum % DECIMAL) % DECIMAL == Character.digit(barcode.charAt(last), DECIMAL);
    }
}

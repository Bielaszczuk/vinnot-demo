package com.vinnot.payment.domain.valueobject;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * A versioned Vinnot ticket commission. The id names the rate ({@code VINNOT_8_PERCENT_V1} is 800 basis points,
 * {@code VINNOT_2_5_PERCENT_V1} is 250), so a stored checkout always says which terms it was sold under.
 */
public record CommissionPolicy(int basisPoints, String id) {
    private static final int MAXIMUM_BASIS_POINTS = 3000;
    private static final Pattern ID = Pattern.compile("^VINNOT_([0-9]+)(?:_([0-9]+))?_PERCENT_V[0-9]+$");
    /** The original terms: 3%. Built after ID, which the constructor reads. */
    public static final CommissionPolicy DEFAULT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");

    public CommissionPolicy {
        if (basisPoints <= 0 || basisPoints > MAXIMUM_BASIS_POINTS) {
            throw new IllegalArgumentException("Commission basis points must be between 1 and 3000");
        }
        var match = Objects.isNull(id) ? null : ID.matcher(id);
        if (Objects.isNull(match) || !match.matches()) {
            throw new IllegalArgumentException("Commission policy must look like VINNOT_<percent>_PERCENT_V<version>");
        }
        var named = new BigDecimal(Objects.isNull(match.group(2)) ? match.group(1) : match.group(1) + "." + match.group(2));
        if (named.movePointRight(2).compareTo(BigDecimal.valueOf(basisPoints)) != 0) {
            throw new IllegalArgumentException("Commission policy " + id + " does not match " + basisPoints + " basis points");
        }
    }

    /** The rate as a percentage, for example 3 or 2.5. */
    public BigDecimal percent() {
        return BigDecimal.valueOf(basisPoints).movePointLeft(2);
    }
}

package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

/**
 * Value object representing the sensory taste profile of a wine.
 * Each score is an optional integer from 0 to 100.
 */
public final class TasteProfile extends ValueObject {

    private static final int MIN_SCORE = 0;
    private static final int MAX_SCORE = 100;

    private final Integer acidity;
    private final Integer tannin;
    private final Integer body;
    private final Integer sweetness;

    private TasteProfile(Integer acidity, Integer tannin, Integer body, Integer sweetness) {
        validate("acidity", acidity);
        validate("tannin", tannin);
        validate("body", body);
        validate("sweetness", sweetness);
        this.acidity = acidity;
        this.tannin = tannin;
        this.body = body;
        this.sweetness = sweetness;
    }

    public static TasteProfile of(Integer acidity, Integer tannin, Integer body, Integer sweetness) {
        if (Objects.isNull(acidity) && Objects.isNull(tannin)
                && Objects.isNull(body) && Objects.isNull(sweetness)) {
            return null;
        }
        return new TasteProfile(acidity, tannin, body, sweetness);
    }

    private void validate(String field, Integer value) {
        if (Objects.nonNull(value) && (value < MIN_SCORE || value > MAX_SCORE)) {
            throw new DomainException("INVALID_TASTE_SCORE",
                    String.format("%s score must be between %d and %d", field, MIN_SCORE, MAX_SCORE));
        }
    }

    public Integer getAcidity() {
        return acidity;
    }

    public Integer getTannin() {
        return tannin;
    }

    public Integer getBody() {
        return body;
    }

    public Integer getSweetness() {
        return sweetness;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{acidity, tannin, body, sweetness};
    }

    @Override
    public String toString() {
        return String.format("TasteProfile{acidity=%s, tannin=%s, body=%s, sweetness=%s}",
                acidity, tannin, body, sweetness);
    }
}


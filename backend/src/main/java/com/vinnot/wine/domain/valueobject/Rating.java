package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Value object representing wine rating statistics.
 */
public final class Rating extends ValueObject {

    private static final BigDecimal MIN_RATING = BigDecimal.ZERO;
    private static final BigDecimal MAX_RATING = new BigDecimal("5.0");
    private static final int SCALE = 2;

    private final BigDecimal average;
    private final int count;

    private Rating(BigDecimal average, int count) {
        validate(average, count);
        this.average = Objects.nonNull(average)
                ? average.setScale(SCALE, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        this.count = count;
    }

    /**
     * Creates an initial rating with no reviews.
     *
     * @return a zero rating
     */
    public static Rating initial() {
        return new Rating(BigDecimal.ZERO, 0);
    }

    /**
     * Creates a Rating from existing values.
     *
     * @param average the rating average
     * @param count   the number of ratings
     * @return the Rating value object
     */
    public static Rating of(BigDecimal average, int count) {
        return new Rating(average, count);
    }

    private void validate(BigDecimal avg, int cnt) {
        if (cnt < 0) {
            throw new DomainException("INVALID_RATING_COUNT", "Rating count cannot be negative");
        }
        if (Objects.nonNull(avg)) {
            if (avg.compareTo(MIN_RATING) < 0 || avg.compareTo(MAX_RATING) > 0) {
                throw new DomainException("INVALID_RATING",
                        String.format("Rating must be between %s and %s", MIN_RATING, MAX_RATING));
            }
        }
    }

    /**
     * Gets the rating average.
     *
     * @return the average rating
     */
    public BigDecimal getAverage() {
        return average;
    }

    /**
     * Gets the number of ratings.
     *
     * @return the count
     */
    public int getCount() {
        return count;
    }

    /**
     * Calculates new rating after adding a review.
     *
     * @param newRating the new rating value (1-5)
     * @return updated Rating
     */
    public Rating addRating(BigDecimal newRating) {
        int newCount = this.count + 1;
        BigDecimal totalSum = this.average.multiply(BigDecimal.valueOf(this.count)).add(newRating);
        BigDecimal newAverage = totalSum.divide(BigDecimal.valueOf(newCount), SCALE, RoundingMode.HALF_UP);
        return new Rating(newAverage, newCount);
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{average, count};
    }

    @Override
    public String toString() {
        return String.format("%s (%d reviews)", average, count);
    }
}


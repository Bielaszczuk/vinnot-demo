package com.vinnot.shared.infrastructure.web.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A rating from 0.1 to 5.0 with at most one significant decimal (#455), the scale reviews and the cellar share:
 * {@code 3.6}, {@code 3.60} and {@code 4} are valid, {@code 3.65}, {@code 0.05}, {@code 5.1} and {@code 0} are not.
 * A null rating is valid; combine with {@code @NotNull} when it is required.
 */
@Documented
@Constraint(validatedBy = OneDecimalRatingValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface OneDecimalRating {
    String message() default "must be between 0.1 and 5.0 with at most one decimal";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}

package com.vinnot.cellar.infrastructure.web.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** S8: the cellar requests take one decimal between 0.1 and 5.0; the whole numbers old apps send stay valid. */
class CellarRatingRequestTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "5.0", "2.2", "4", "3.60", "5.00", "0.10"})
    void acceptsOneDecimal(String rating) {
        assertThat(validator.validate(new AddWineToCellarRequest(UUID.randomUUID(), new BigDecimal(rating), null, null, null)))
                .isEmpty();
        assertThat(validator.validate(new UpdateCellarEntryRequest(new BigDecimal(rating), null, null, null, null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.05", "5.1", "2.15", "3.65", "0"})
    void rejectsOtherScales(String rating) {
        assertThat(validator.validate(new AddWineToCellarRequest(UUID.randomUUID(), new BigDecimal(rating), null, null, null)))
                .extracting(violation -> violation.getPropertyPath().toString()).contains("rating");
        assertThat(validator.validate(new UpdateCellarEntryRequest(new BigDecimal(rating), null, null, null, null)))
                .extracting(violation -> violation.getPropertyPath().toString()).contains("rating");
    }
}

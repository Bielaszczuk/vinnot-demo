package com.vinnot.admin.infrastructure.web.request;

import tools.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class CreateWineryAdminRequestTest {
    @Test
    void countryIsRequiredBeforeCallingTheDomain() throws Exception {
        var mapper = new ObjectMapper();
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var invalid = mapper.readValue("{\"name\":\"Test winery\"}", CreateWineryAdminRequest.class);
            assertThat(validator.validate(invalid)).anySatisfy(violation ->
                    assertThat(violation.getPropertyPath().toString()).isEqualTo("countryId"));
            var valid = mapper.readValue("{\"name\":\"Test winery\",\"countryId\":\"" + UUID.randomUUID() + "\"}",
                    CreateWineryAdminRequest.class);
            assertThat(validator.validate(valid)).isEmpty();
        }
    }
}

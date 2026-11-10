package com.vinnot.shared.infrastructure.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;

/**
 * Jackson JsonMapper configuration.
 *
 * <p>The application runs on Jackson 3 with {@code spring.jackson.use-jackson2-defaults=true},
 * which keeps the wire format the API had on Jackson 2: declaration-order properties,
 * {@code null} accepted for primitives and trailing content tolerated. Jackson 3 always uses
 * standard bean naming, so boolean record components such as {@code isActive} keep their
 * {@code is} prefix. The features below are pinned explicitly on top of those defaults.</p>
 */
@Configuration
public class JacksonConfig {

    /**
     * Customizes the JsonMapper for consistent serialization behavior.
     *
     * @return the customizer
     */
    @Bean
    public JsonMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }
}

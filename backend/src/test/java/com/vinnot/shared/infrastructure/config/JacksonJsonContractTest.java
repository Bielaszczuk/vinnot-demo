package com.vinnot.shared.infrastructure.config;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.annotation.Resource;
import java.util.Locale;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins the JSON wire format produced and accepted by the application's HTTP message converter,
 * so a Jackson or Spring Boot upgrade cannot silently change date, enum, null, decimal,
 * property-naming or property-order behaviour of the public API.
 */
@WebMvcTest(controllers = JacksonJsonContractTest.ProbeController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({JacksonConfig.class, JacksonJsonContractTest.ProbeController.class})
class JacksonJsonContractTest {

    private static final String SERIALIZED = "{"
            + "\"id\":\"0a8f8c2e-4a43-4d34-9a3e-2b0a8f0d5c11\","
            + "\"instant\":\"2026-01-02T03:04:05.123Z\","
            + "\"wholeSecondInstant\":\"2026-01-02T03:04:05Z\","
            + "\"date\":\"2026-01-02\","
            + "\"dateTime\":\"2026-01-02T03:04:05\","
            + "\"offsetDateTime\":\"2026-01-02T03:04:05-03:00\","
            + "\"price\":12.50,"
            + "\"ratio\":0.1,"
            + "\"count\":7,"
            + "\"status\":\"PUBLISHED\","
            + "\"missing\":null,"
            + "\"isActive\":true,"
            + "\"tags\":[\"b\",\"a\"],"
            + "\"attributes\":{\"zeta\":1,\"alpha\":2}"
            + "}";

    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @MockitoBean
    private JwtAuthenticationFilter jwt;
    @MockitoBean
    private RateLimitingFilter limits;
    @Resource
    private MockMvc mvc;

    @Test
    void serializesDatesEnumsNullsDecimalsBooleanNamesAndDeclarationOrder() throws Exception {
        mvc.perform(get("/json-contract"))
                .andExpect(status().isOk())
                .andExpect(content().string(SERIALIZED));
    }

    @Test
    void acceptsUnknownPropertiesNullPrimitivesIsoDatesAndEnumNames() throws Exception {
        mvc.perform(post("/json-contract").contentType(MediaType.APPLICATION_JSON).content("""
                        {"count":null,"status":"DRAFT","instant":"2026-01-02T03:04:05.123Z",
                         "date":"2026-01-02","price":"3.10","isActive":true,"unknown":{"nested":1}}
                        """))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        "{\"count\":0,\"status\":\"DRAFT\",\"instant\":\"2026-01-02T03:04:05.123Z\","
                                + "\"date\":\"2026-01-02\",\"price\":3.10,\"isActive\":true}"));
    }

    @Test
    void acceptsTrailingContentAfterTheRequestDocument() throws Exception {
        mvc.perform(post("/json-contract").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"count\":1,\"status\":\"DRAFT\"} {\"count\":2}"))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        "{\"count\":1,\"status\":\"DRAFT\",\"instant\":null,\"date\":null,\"price\":null,"
                                + "\"isActive\":false}"));
    }

    @Test
    void rejectsUnknownEnumConstants() throws Exception {
        mvc.perform(post("/json-contract").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"count\":1,\"status\":\"draft\"}"))
                .andExpect(status().isBadRequest());
    }

    /** Status whose {@code toString()} differs from its name, to pin enum-by-name serialization. */
    enum ProbeStatus {
        DRAFT,
        PUBLISHED;

        @Override
        public String toString() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    /** Response fixture covering the value types exposed by API responses. */
    record ProbeResponse(
            UUID id,
            Instant instant,
            Instant wholeSecondInstant,
            LocalDate date,
            LocalDateTime dateTime,
            OffsetDateTime offsetDateTime,
            BigDecimal price,
            Double ratio,
            Integer count,
            ProbeStatus status,
            String missing,
            boolean isActive,
            List<String> tags,
            Map<String, Integer> attributes) {
    }

    /** Request fixture covering the value types accepted by API requests. */
    record ProbeRequest(int count, ProbeStatus status, Instant instant, LocalDate date, BigDecimal price,
                        boolean isActive) {
    }

    @RestController
    static class ProbeController {

        @GetMapping("/json-contract")
        ProbeResponse read() {
            Map<String, Integer> attributes = new LinkedHashMap<>();
            attributes.put("zeta", 1);
            attributes.put("alpha", 2);
            return new ProbeResponse(
                    UUID.fromString("0a8f8c2e-4a43-4d34-9a3e-2b0a8f0d5c11"),
                    Instant.parse("2026-01-02T03:04:05.123Z"),
                    Instant.parse("2026-01-02T03:04:05Z"),
                    LocalDate.of(2026, 1, 2),
                    LocalDateTime.of(2026, 1, 2, 3, 4, 5),
                    OffsetDateTime.of(2026, 1, 2, 3, 4, 5, 0, ZoneOffset.ofHours(-3)),
                    new BigDecimal("12.50"),
                    0.1,
                    7,
                    ProbeStatus.PUBLISHED,
                    null,
                    true,
                    List.of("b", "a"),
                    attributes);
        }

        @PostMapping("/json-contract")
        ProbeRequest echo(@RequestBody ProbeRequest request) {
            return request;
        }
    }
}

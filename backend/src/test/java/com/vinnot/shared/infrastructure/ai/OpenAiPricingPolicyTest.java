package com.vinnot.shared.infrastructure.ai;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenAiPricingPolicyTest {
    private final OpenAiPricingPolicy pricing = OpenAiTestFixtures.pricing();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void reservesTheEntirePricedContextAndRequestedOutput() {
        assertThat(pricing.maximumCost("gpt-4o-mini", 500)).isEqualByComparingTo("0.01950000");
        assertThatThrownBy(() -> pricing.maximumCost("unpriced", 500))
                .isInstanceOf(ExternalServiceUnavailableException.class).extracting("code")
                .isEqualTo("AI_PRICING_UNAVAILABLE");
        assertThatThrownBy(() -> pricing.maximumCost("gpt-4o-mini", 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pricing.maximumCost("gpt-4o-mini", 16385))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void accountsReportedUsageConservativelyWithoutApplyingCachedInputDiscounts() throws Exception {
        var response = mapper.readTree("""
                {"model":"gpt-4o-mini","service_tier":"default","usage":{
                  "prompt_tokens":1000,"completion_tokens":500,
                  "prompt_tokens_details":{"cached_tokens":1000}}}
                """);
        assertThat(pricing.observedCost(response, 500).orElseThrow()).isEqualByComparingTo("0.00045000");
        assertThat(pricing.observedCost(mapper.readTree(
                "{\"usage\":{\"prompt_tokens\":0,\"completion_tokens\":0}}"), 500).orElseThrow())
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}", "{\"usage\":{}}",
            "{\"usage\":{\"prompt_tokens\":1.5,\"completion_tokens\":1}}",
            "{\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1.5}}",
            "{\"usage\":{\"prompt_tokens\":999999999999999999999,\"completion_tokens\":1}}",
            "{\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":999999999999999999999}}",
            "{\"usage\":{\"prompt_tokens\":-1,\"completion_tokens\":1}}",
            "{\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":-1}}",
            "{\"usage\":{\"prompt_tokens\":128001,\"completion_tokens\":1}}",
            "{\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":501}}",
            "{\"model\":\"unpriced\",\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1}}",
            "{\"service_tier\":\"priority\",\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1}}",
            "{\"model\":{\"id\":\"gpt-4o-mini\"},\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1}}",
            "{\"service_tier\":[\"default\"],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1}}"
    })
    void unknownOrUntrustedBillingKeepsTheFullReservation(String body) throws Exception {
        assertThat(pricing.observedCost(mapper.readTree(body), 500)).isEmpty();
    }

    @Test
    void acceptsOnlyTheConfiguredServiceTiers() throws Exception {
        var fast = new OpenAiPricingPolicy(Set.of("gpt-6-luna"), new BigDecimal("0.20"), new BigDecimal("1.00"),
                128000, 16384, Set.of("default", "priority", "fast"));
        var response = mapper.readTree("""
                {"model":"gpt-6-luna","service_tier":"fast","usage":{"prompt_tokens":1000,"completion_tokens":500}}
                """);
        assertThat(fast.observedCost(response, 500).orElseThrow()).isEqualByComparingTo("0.00070000");
        assertThat(fast.observedCost(mapper.readTree(
                "{\"service_tier\":\"flex\",\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1}}"), 500))
                .isEmpty();
    }

    @Test
    void rejectsInvalidPolicyAtStartup() {
        assertInvalid(Set.of(), BigDecimal.ONE, BigDecimal.ONE, 1, 1);
        assertInvalid(Set.of("m"), BigDecimal.ZERO, BigDecimal.ONE, 1, 1);
        assertInvalid(Set.of("m"), BigDecimal.ONE, BigDecimal.ZERO, 1, 1);
        assertInvalid(Set.of("m"), BigDecimal.ONE, BigDecimal.ONE, 0, 1);
        assertInvalid(Set.of("m"), BigDecimal.ONE, BigDecimal.ONE, 1, 0);
        assertThatThrownBy(() -> new OpenAiPricingPolicy(Set.of("m"), BigDecimal.ONE, BigDecimal.ONE, 1, 1, Set.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private void assertInvalid(Set<String> models, BigDecimal input, BigDecimal output, int in, int out) {
        assertThatThrownBy(() -> new OpenAiPricingPolicy(models, input, output, in, out, Set.of("default")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

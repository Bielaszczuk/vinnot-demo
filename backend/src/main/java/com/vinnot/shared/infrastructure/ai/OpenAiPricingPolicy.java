package com.vinnot.shared.infrastructure.ai;

import tools.jackson.databind.JsonNode;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;
import java.util.Optional;

/** Conservative standard-tier token accounting for explicitly priced models only. */
@Component
public class OpenAiPricingPolicy {

    private static final BigDecimal TOKENS_PER_MILLION = BigDecimal.valueOf(1_000_000);
    private static final int MONEY_SCALE = 8;
    private final Set<String> models;
    private final BigDecimal inputPerMillion;
    private final BigDecimal outputPerMillion;
    private final int maximumInputTokens;
    private final int maximumOutputTokens;
    private final Set<String> serviceTiers;

    public OpenAiPricingPolicy(
            @Value("${services.openai.pricing.models:gpt-4o-mini,gpt-4o-mini-2024-07-18}") Set<String> models,
            @Value("${services.openai.pricing.input-per-million-usd:0.15}") BigDecimal inputPerMillion,
            @Value("${services.openai.pricing.output-per-million-usd:0.60}") BigDecimal outputPerMillion,
            @Value("${services.openai.pricing.maximum-input-tokens:128000}") int maximumInputTokens,
            @Value("${services.openai.pricing.maximum-output-tokens:16384}") int maximumOutputTokens,
            @Value("${services.openai.pricing.service-tiers:default}") Set<String> serviceTiers) {
        if (models.isEmpty() || inputPerMillion.signum() <= 0 || outputPerMillion.signum() <= 0
                || maximumInputTokens < 1 || maximumOutputTokens < 1 || serviceTiers.isEmpty()) {
            throw new IllegalArgumentException("Explicit positive model prices and token bounds are required");
        }
        this.models = Set.copyOf(models);
        this.inputPerMillion = inputPerMillion;
        this.outputPerMillion = outputPerMillion;
        this.maximumInputTokens = maximumInputTokens;
        this.maximumOutputTokens = maximumOutputTokens;
        // Prices must be those of the most expensive accepted tier: one price pair covers them all.
        this.serviceTiers = Set.copyOf(serviceTiers);
    }

    public BigDecimal maximumCost(String model, int outputTokens) {
        if (!models.contains(model)) {
            throw new ExternalServiceUnavailableException("AI_PRICING_UNAVAILABLE",
                    "The configured AI model needs a reviewed spending policy", null);
        }
        if (outputTokens < 1 || outputTokens > maximumOutputTokens) {
            throw new IllegalArgumentException("Requested output exceeds the priced model limit");
        }
        // Reserve the whole supported context; no optimistic image-token estimation.
        return cost(maximumInputTokens, outputTokens);
    }

    public Optional<BigDecimal> observedCost(JsonNode response, int requestedOutputTokens) {
        if ((response.has("service_tier") && !serviceTiers.contains(response.path("service_tier").asText("")))
                || (response.has("model") && !models.contains(response.path("model").asText("")))) {
            return Optional.empty();
        }
        JsonNode usage = response.path("usage");
        JsonNode input = usage.path("prompt_tokens");
        JsonNode output = usage.path("completion_tokens");
        if (!input.isIntegralNumber() || !output.isIntegralNumber()
                || !input.canConvertToLong() || !output.canConvertToLong()
                || input.longValue() < 0 || output.longValue() < 0
                || input.longValue() > maximumInputTokens
                || output.longValue() > Math.min(requestedOutputTokens, maximumOutputTokens)) {
            return Optional.empty();
        }
        // Charge all input at the ordinary rate; cached-token discounts are conservative headroom.
        return Optional.of(cost(input.longValue(), output.longValue()));
    }

    private BigDecimal cost(long input, long output) {
        return inputPerMillion.multiply(BigDecimal.valueOf(input))
                .add(outputPerMillion.multiply(BigDecimal.valueOf(output)))
                .divide(TOKENS_PER_MILLION, MONEY_SCALE, RoundingMode.CEILING);
    }
}

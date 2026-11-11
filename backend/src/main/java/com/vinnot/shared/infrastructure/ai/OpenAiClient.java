package com.vinnot.shared.infrastructure.ai;

import tools.jackson.core.type.TypeReference;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiImageCompletionRequest;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry.AiOutcome;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import java.util.Locale;

/** Bounded transport, paid-attempt admission and conservative billing reconciliation. */
@Component
public class OpenAiClient implements AiCompletionService {

    private static final Logger LOG = LoggerFactory.getLogger(OpenAiClient.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final int HTTP_REDIRECTION = 300;
    private static final int HTTP_TOO_MANY_REQUESTS = 429;
    private static final int HTTP_STATUS_UPPER_BOUND = 600;
    private static final long MAX_BACKOFF_MS = 2_000L;
    private static final long JITTER_MS = 100L;
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    private static final int MAX_REQUEST_BYTES = 12 * 1024 * 1024;
    private static final Duration MAX_OPERATION_TIMEOUT = Duration.ofSeconds(60);
    /** Time an interactive request keeps for the provider call itself after waiting for a slot. */
    private static final Duration MIN_PROVIDER_CALL = Duration.ofSeconds(3);
    private static final Set<String> BILLING_ERRORS = Set.of("insufficient_quota", "credit_balance_exhausted",
            "billing_hard_limit_reached", "organization_spend_limit_exceeded", "project_spend_limit_exceeded");
    private final HttpClient httpClient;
    private final URI completionUri;
    private final ObjectMapper objectMapper;
    private final Duration operationTimeout;
    private final AiProviderAdmissionPort admission;
    private final OpenAiPricingPolicy pricing;
    private final OperationalTelemetry telemetry;

    @Value("${services.openai.api-key:}")
    private String apiKey;
    @Value("${ai.enabled:false}")
    private boolean aiEnabled;
    @Value("${ai.provider:mock}")
    private String aiProvider;
    @Value("${services.openai.model:gpt-4o-mini}")
    private String model;
    @Value("${services.openai.vision-model:gpt-4o-mini}")
    private String visionModel;
    /** Processing tier for text completions; "priority" trades a higher price for faster output. */
    @Value("${services.openai.service-tier:default}")
    private String serviceTier = "default";
    /** Same as reasoning-effort, for the vision model used by label scans. */
    @Value("${services.openai.vision-reasoning-effort:}")
    private String visionReasoningEffort = "";

    /** Set for reasoning models, which take reasoning_effort and max_completion_tokens instead of sampling knobs. */
    @Value("${services.openai.reasoning-effort:}")
    private String reasoningEffort = "";
    @Value("${services.openai.retry.max-attempts:2}")
    private int maxAttempts;
    @Value("${services.openai.retry.initial-backoff-ms:250}")
    private long initialBackoffMs;

    public OpenAiClient(ObjectMapper objectMapper,
            @Value("${services.openai.base-url:https://api.openai.com/v1/chat/completions}") String baseUrl,
            @Value("${services.openai.connect-timeout:10s}") Duration connectTimeout,
            @Value("${services.openai.read-timeout:30s}") Duration operationTimeout,
            AiProviderAdmissionPort admission, OpenAiPricingPolicy pricing, OperationalTelemetry telemetry) {
        requireTimeout(connectTimeout);
        requireTimeout(operationTimeout);
        this.objectMapper = objectMapper;
        this.operationTimeout = operationTimeout;
        this.admission = admission;
        this.pricing = pricing;
        this.telemetry = telemetry;
        this.completionUri = URI.create(baseUrl);
        this.httpClient = HttpClient.newBuilder().connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override
    public boolean isAvailable() {
        return aiEnabled && "openai".equals(aiProvider) && Objects.nonNull(apiKey) && !apiKey.isBlank();
    }

    @Override
    public boolean isMockMode() {
        return "mock".equals(aiProvider);
    }

    @Override
    public String configurationId() {
        return aiProvider + ":" + model;
    }

    @Override
    public Map<String, Object> chatCompletion(String prompt, double temperature, int maxTokens) {
        return executeWithRetry("text", model, maxTokens, maxAttempts, operationTimeout, () -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("service_tier", serviceTier);
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            if (Objects.isNull(reasoningEffort) || reasoningEffort.isBlank()) {
                body.put("temperature", temperature);
                body.put("max_tokens", maxTokens);
            } else {
                body.put("reasoning_effort", reasoningEffort);
                body.put("max_completion_tokens", maxTokens);
            }
            body.put("response_format", Map.of("type", "json_object"));
            return body;
        });
    }

    @Override
    public Map<String, Object> structuredCompletionWithImage(AiImageCompletionRequest request) {
        requireTimeout(request.timeout());
        return executeWithRetry("vision", visionModel, request.maxTokens(), request.maxAttempts(),
                request.timeout(), true, () -> {
                    // Encoding occurs only after an execution permit and budget have been acquired.
                    String dataUri = "data:" + request.contentType() + ";base64,"
                            + Base64.getEncoder().encodeToString(request.imageBytes());
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("model", visionModel);
                    body.put("service_tier", "default");
                    body.put("messages", List.of(Map.of("role", "user", "content", List.of(
                            Map.of("type", "text", "text", request.prompt()),
                            Map.of("type", "image_url", "image_url", Map.of("url", dataUri,
                                    "detail", request.detail().name().toLowerCase(Locale.ROOT)))))));
                    if (Objects.isNull(visionReasoningEffort) || visionReasoningEffort.isBlank()) {
                        body.put("temperature", request.temperature());
                        body.put("max_tokens", request.maxTokens());
                    } else {
                        body.put("reasoning_effort", visionReasoningEffort);
                        body.put("max_completion_tokens", request.maxTokens());
                    }
                    body.put("response_format", Map.of("type", "json_schema", "json_schema", Map.of(
                            "name", request.schemaName(), "strict", true, "schema", request.jsonSchema())));
                    return body;
                });
    }

    private Map<String, Object> executeWithRetry(String operation, String requestedModel, int tokens,
            int configuredAttempts, Duration timeout, Supplier<Map<String, Object>> request) {
        return executeWithRetry(operation, requestedModel, tokens, configuredAttempts, timeout, false, request);
    }

    private Map<String, Object> executeWithRetry(String operation, String requestedModel, int tokens,
            int configuredAttempts, Duration timeout, boolean interactive, Supplier<Map<String, Object>> request) {
        BigDecimal maximumCost = pricing.maximumCost(requestedModel, tokens);
        int attempts = Math.max(1, Math.min(configuredAttempts, MAX_ATTEMPTS));
        long deadline = System.nanoTime() + timeout.toNanos();
        for (int attempt = 1; attempt <= attempts && System.nanoTime() < deadline; attempt++) {
            if (Thread.currentThread().isInterrupted()) {
                return Map.of();
            }
            try {
                return executeAttempt(requestedModel, tokens, maximumCost, deadline, interactive, request);
            } catch (ExternalServiceUnavailableException exception) {
                AiOutcome outcome = switch (exception.getCode()) {
                    case "AI_BUDGET_EXHAUSTED" -> AiOutcome.BUDGET_EXHAUSTED;
                    case "AI_PAID_CALLS_PAUSED" -> AiOutcome.PAUSED;
                    case "AI_CAPACITY_EXCEEDED" -> AiOutcome.CAPACITY_EXCEEDED;
                    default -> AiOutcome.ADMISSION_FAILURE;
                };
                telemetry.recordAi(outcome);
                throw exception;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return Map.of();
            } catch (Exception exception) {
                LOG.warn("OpenAI {} attempt {}/{} failed: {}", operation, attempt, attempts,
                        exception.getClass().getSimpleName());
                long delay = retryDelay(exception, attempt);
                long remainingMs = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
                if (attempt == attempts || delay < 0 || delay >= remainingMs || !pause(delay)) {
                    return Map.of();
                }
            }
        }
        return Map.of();
    }

    private Map<String, Object> executeAttempt(String requestedModel, int outputTokens, BigDecimal maximumCost, long deadline,
            boolean interactive, Supplier<Map<String, Object>> requestBody) throws Exception {
        // A request someone waits on may queue briefly, but never so long that the call itself cannot finish.
        var permit = interactive
                ? admission.acquireInteractive(requestedModel, maximumCost,
                        Duration.ofNanos(Math.max(0, deadline - System.nanoTime())).minus(MIN_PROVIDER_CALL))
                : admission.acquire(requestedModel, maximumCost);
        Optional<BigDecimal> observed = Optional.of(BigDecimal.ZERO);
        try {
            byte[] requestJson = objectMapper.writeValueAsBytes(requestBody.get());
            if (requestJson.length > MAX_REQUEST_BYTES) {
                throw new IllegalArgumentException("AI request exceeds the byte limit");
            }
            long remainingNanos = deadline - System.nanoTime();
            if (remainingNanos <= 0) {
                telemetry.recordAi(AiOutcome.TIMEOUT);
                return Map.of();
            }
            observed = Optional.empty();
            HttpResponse<String> response = send(requestJson, Duration.ofNanos(remainingNanos));
            if (response.statusCode() < 200 || response.statusCode() >= HTTP_REDIRECTION) {
                // A provider rejection is not treated as a known-free call without usage evidence.
                String code = errorCode(response.body());
                throw new ProviderResponseException(response.statusCode(), code,
                        response.headers().firstValue("Retry-After").orElse(""));
            }
            var tree = objectMapper.readTree(response.body());
            observed = pricing.observedCost(tree, outputTokens);
            String content = tree.path("choices").path(0).path("message").path("content").asText("");
            if (content.isBlank()) {
                throw new InvalidProviderContentException();
            }
            Map<String, Object> parsed = objectMapper.readValue(content, new TypeReference<>() { });
            if (Objects.isNull(parsed) || parsed.isEmpty()) {
                throw new InvalidProviderContentException();
            }
            telemetry.recordAi(AiOutcome.SUCCESS);
            return parsed;
        } catch (Exception exception) {
            telemetry.recordAi(classifyFailure(exception));
            throw exception;
        } finally {
            admission.complete(permit, observed);
        }
    }

    private AiOutcome classifyFailure(Exception failure) {
        if (failure instanceof ProviderResponseException response) {
            if (BILLING_ERRORS.contains(response.code)) {
                return AiOutcome.QUOTA_EXHAUSTED;
            }
            return response.status == HTTP_TOO_MANY_REQUESTS ? AiOutcome.RATE_LIMITED : AiOutcome.PROVIDER_FAILURE;
        }
        if (failure instanceof InvalidProviderContentException || failure instanceof JacksonException) {
            return AiOutcome.INVALID_RESPONSE;
        }
        if (failure instanceof InterruptedException) {
            return AiOutcome.CANCELLED;
        }
        Throwable cause = failure instanceof ExecutionException ? failure.getCause() : failure;
        return cause instanceof TimeoutException || cause instanceof HttpTimeoutException
                ? AiOutcome.TIMEOUT : AiOutcome.PROVIDER_FAILURE;
    }

    private HttpResponse<String> send(byte[] requestJson, Duration remaining)
            throws InterruptedException, ExecutionException, TimeoutException {
        HttpRequest request = HttpRequest.newBuilder(completionUri).timeout(remaining)
                .header("Authorization", "Bearer " + apiKey).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(requestJson)).build();
        var response = httpClient.sendAsync(request, HttpResponse.BodyHandlers.limiting(
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8), MAX_RESPONSE_BYTES));
        try {
            // Covers response-body download too, not just connection/response headers.
            return response.get(remaining.toNanos(), TimeUnit.NANOSECONDS);
        } catch (InterruptedException | TimeoutException exception) {
            response.cancel(true);
            throw exception;
        }
    }

    private long retryDelay(Exception exception, int completedAttempt) {
        if (!(exception instanceof ProviderResponseException)
                && !(exception instanceof InvalidProviderContentException)) {
            return -1; // Do not replay an ambiguously processed transport timeout.
        }
        long minimum = 0;
        if (exception instanceof ProviderResponseException failure) {
            if (BILLING_ERRORS.contains(failure.code)
                    || (failure.status != HTTP_TOO_MANY_REQUESTS
                    && (failure.status < 500 || failure.status >= HTTP_STATUS_UPPER_BOUND))) {
                return -1;
            }
            minimum = serverDelay(failure.retryAfter);
            if (minimum > MAX_BACKOFF_MS) {
                return -1;
            }
        }
        long delay = Math.min(Math.max(0, initialBackoffMs), MAX_BACKOFF_MS);
        delay = Math.min(delay * (1L << (completedAttempt - 1)), MAX_BACKOFF_MS);
        return Math.max(delay, minimum) + ThreadLocalRandom.current().nextLong(JITTER_MS + 1);
    }

    private long serverDelay(String header) {
        if (header.isBlank()) {
            return 0;
        }
        String normalized = header.trim();
        if (normalized.matches("[0-9]+")) {
            try {
                return Math.multiplyExact(Long.parseLong(normalized), 1000L);
            } catch (NumberFormatException | ArithmeticException overflow) {
                return Long.MAX_VALUE; // Never retry earlier than an unrepresentably large delay.
            }
        }
        try {
            return Math.max(0, Duration.between(Instant.now(),
                    ZonedDateTime.parse(normalized, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).toMillis());
        } catch (RuntimeException invalid) {
            return 0;
        }
    }

    private String errorCode(String body) {
        try {
            return objectMapper.readTree(body).path("error").path("code").asText("");
        } catch (Exception exception) {
            return "";
        }
    }

    private boolean pause(long milliseconds) {
        try {
            Thread.sleep(milliseconds);
            return true;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static void requireTimeout(Duration timeout) {
        if (timeout.toMillis() < 1 || timeout.compareTo(MAX_OPERATION_TIMEOUT) > 0) {
            throw new IllegalArgumentException("AI timeout must be between 1 millisecond and 60 seconds");
        }
    }

    private static final class InvalidProviderContentException extends Exception {
    }

    private static final class ProviderResponseException extends Exception {
        private final int status;
        private final String code;
        private final String retryAfter;

        private ProviderResponseException(int status, String code, String retryAfter) {
            super("Provider HTTP status " + status);
            this.status = status;
            this.code = code;
            this.retryAfter = retryAfter;
        }
    }
}

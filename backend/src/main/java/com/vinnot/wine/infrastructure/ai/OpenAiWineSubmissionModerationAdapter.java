package com.vinnot.wine.infrastructure.ai;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import com.vinnot.shared.infrastructure.http.HttpOperationDeadline;
import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Semaphore;

/**
 * Specialized multimodal content-safety review. Wine relevance is supplied by
 * the separate recognition port so each provider contract has one purpose.
 */
@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "openai")
public class OpenAiWineSubmissionModerationAdapter
        implements WineSubmissionModerationPort {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_CONCURRENT_REVIEWS = 2;
    private static final int MAXIMUM_REQUEST_BYTES = 12 * 1024 * 1024;
    private static final int MAXIMUM_RESPONSE_BYTES = 1024 * 1024;
    private final Semaphore reviewSlots = new Semaphore(MAX_CONCURRENT_REVIEWS);
    private final ObjectMapper objectMapper;
    private final RestClient moderationClient;
    private final String apiKey;
    private final String moderationModel;

    public OpenAiWineSubmissionModerationAdapter(
            ObjectMapper objectMapper,
            @Value("${services.openai.moderation-url:"
                    + "https://api.openai.com/v1/moderations}")
            String moderationUrl,
            @Value("${services.openai.api-key:}") String apiKey,
            @Value("${services.openai.moderation-model:omni-moderation-latest}")
            String moderationModel) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.moderationModel = moderationModel;
        this.moderationClient = RestClient.builder()
                .baseUrl(moderationUrl)
                .requestFactory(new DeadlineHttpRequestFactory(CONNECT_TIMEOUT, READ_TIMEOUT,
                        MAXIMUM_REQUEST_BYTES, MAXIMUM_RESPONSE_BYTES))
                .build();
    }

    @Override
    public WineContentSafetyReview reviewSafety(
            WineSubmission submission, byte[] imageBytes, String contentType) {
        if (!reviewSlots.tryAcquire()) {
            return unavailable();
        }
        try (var deadline = HttpOperationDeadline.start(READ_TIMEOUT)) {
            WineContentSafetyReview review = moderateSafety(submission, imageBytes, contentType);
            deadline.check();
            return review;
        } catch (RuntimeException exception) {
            return unavailable();
        } finally {
            reviewSlots.release();
        }
    }

    @SuppressWarnings("unchecked")
    private WineContentSafetyReview moderateSafety(
            WineSubmission submission, byte[] imageBytes, String contentType) {
        if (Objects.isNull(apiKey) || apiKey.isBlank()) {
            return unavailable();
        }
        String dataUri = "data:" + contentType + ";base64,"
                + Base64.getEncoder().encodeToString(imageBytes);
        String textInput = String.join("\n", List.of(
                submission.getWineName(),
                submission.getWineryName(),
                Objects.requireNonNullElse(submission.getWineType(), ""),
                Objects.toString(submission.getVintage(), ""),
                String.join(", ", submission.getGrapes()),
                Objects.requireNonNullElse(submission.getCountry(), ""),
                Objects.requireNonNullElse(submission.getRegion(), ""),
                Objects.toString(submission.getAlcoholContent(), ""),
                Objects.requireNonNullElse(submission.getNotes(), "")));
        Map<String, Object> request = Map.of(
                "model", moderationModel,
                "input", List.of(
                        Map.of("type", "text", "text", textInput),
                        Map.of("type", "image_url",
                                "image_url", Map.of("url", dataUri))));
        try {
            String responseJson = moderationClient.post()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(request))
                    .retrieve()
                    .body(String.class);
            Map<String, Object> response = objectMapper.readValue(
                    responseJson, new TypeReference<>() { });
            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) response.get("results");
            if (Objects.isNull(results) || results.isEmpty()) {
                return unavailable();
            }
            Object flag = results.getFirst().get("flagged");
            if (!(flag instanceof Boolean flagged)) {
                return unavailable();
            }
            return new WineContentSafetyReview(
                    true,
                    !flagged,
                    flagged
                            ? "The submission was flagged by content safety moderation"
                            : "Content safety moderation passed");
        } catch (Exception exception) {
            return unavailable();
        }
    }

    private WineContentSafetyReview unavailable() {
        return new WineContentSafetyReview(
                false, false, WineSubmissionSystemReason.MODERATION_UNAVAILABLE.storedText());
    }

}

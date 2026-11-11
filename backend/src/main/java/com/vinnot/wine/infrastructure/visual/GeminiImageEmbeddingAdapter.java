package com.vinnot.wine.infrastructure.visual;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Google Gemini embeddings for label images (gemini-embedding-2 by default). Images go inline in one
 * batchEmbedContents request; the provider normalizes vectors reduced to fewer dimensions. The key is sent in the
 * x-goog-api-key header, never in the URL.
 */
@Component
public class GeminiImageEmbeddingAdapter implements WineImageEmbeddingPort {

    static final int MAX_IMAGES_PER_REQUEST = 50;
    private static final int MIN_DIMENSIONS = 128;
    private static final int MAX_DIMENSIONS = 3072;
    private static final int MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
    private static final Set<String> CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final URI baseUri;
    private final String apiKey;
    private final String model;
    private final int dimensions;
    private final Duration timeout;

    public GeminiImageEmbeddingAdapter(ObjectMapper objectMapper,
            @Value("${services.google.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
            @Value("${services.google.gemini.api-key:}") String apiKey,
            @Value("${services.google.gemini.embedding-model:gemini-embedding-2}") String model,
            @Value("${services.google.gemini.embedding-dimensions:768}") int dimensions,
            @Value("${services.google.gemini.connect-timeout:3s}") Duration connectTimeout,
            @Value("${services.google.gemini.timeout:8s}") Duration timeout) {
        if (dimensions < MIN_DIMENSIONS || dimensions > MAX_DIMENSIONS) {
            throw new IllegalArgumentException("services.google.gemini.embedding-dimensions must be 128..3072");
        }
        if (!model.matches("[a-z0-9.-]+")) {
            throw new IllegalArgumentException("services.google.gemini.embedding-model is not a model name");
        }
        this.objectMapper = objectMapper;
        this.baseUri = URI.create(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
        this.apiKey = Objects.requireNonNullElse(apiKey, "").trim();
        this.model = model;
        this.dimensions = dimensions;
        this.timeout = timeout;
        this.httpClient = HttpClient.newBuilder().connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override
    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    @Override
    public String modelId() {
        return model;
    }

    @Override
    public int dimensions() {
        return dimensions;
    }

    @Override
    public List<float[]> embed(List<LabelImage> images) {
        if (images.isEmpty()) {
            return List.of();
        }
        if (images.size() > MAX_IMAGES_PER_REQUEST) {
            throw new IllegalArgumentException("at most " + MAX_IMAGES_PER_REQUEST + " images per request");
        }
        if (!isAvailable()) {
            throw unavailable("Image embeddings are not configured", null);
        }
        HttpRequest request = HttpRequest.newBuilder(baseUri.resolve("models/" + model + ":batchEmbedContents"))
                .timeout(timeout)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody(images)))
                .build();
        HttpResponse<byte[]> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (IOException exception) {
            throw unavailable("Image embedding request failed", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw unavailable("Image embedding request was interrupted", exception);
        }
        if (response.statusCode() != 200) {
            throw unavailable("Image embedding provider answered " + response.statusCode(), null);
        }
        if (response.body().length > MAX_RESPONSE_BYTES) {
            throw unavailable("Image embedding response is too large", null);
        }
        return parse(response.body(), images.size());
    }

    private String requestBody(List<LabelImage> images) {
        ObjectNode body = objectMapper.createObjectNode();
        ArrayNode requests = body.putArray("requests");
        for (LabelImage image : images) {
            if (!CONTENT_TYPES.contains(image.contentType())) {
                throw new IllegalArgumentException("unsupported image type " + image.contentType());
            }
            ObjectNode item = requests.addObject();
            item.put("model", "models/" + model);
            item.put("output_dimensionality", dimensions);
            ObjectNode inline = item.putObject("content").putArray("parts").addObject().putObject("inline_data");
            inline.put("mime_type", image.contentType());
            inline.put("data", Base64.getEncoder().encodeToString(image.bytes()));
        }
        return body.toString();
    }

    private List<float[]> parse(byte[] body, int expected) {
        JsonNode embeddings;
        try {
            embeddings = objectMapper.readTree(body).path("embeddings");
        } catch (JacksonException exception) {
            throw unavailable("Image embedding response is not JSON", exception);
        }
        if (!embeddings.isArray() || embeddings.size() != expected) {
            throw unavailable("Image embedding response has the wrong number of vectors", null);
        }
        List<float[]> vectors = new ArrayList<>(expected);
        for (JsonNode embedding : embeddings) {
            JsonNode values = embedding.path("values");
            if (!values.isArray() || values.size() != dimensions) {
                throw unavailable("Image embedding has the wrong number of dimensions", null);
            }
            float[] vector = new float[dimensions];
            for (int d = 0; d < dimensions; d++) {
                vector[d] = (float) values.get(d).asDouble();
            }
            vectors.add(vector);
        }
        return List.copyOf(vectors);
    }

    private static ExternalServiceUnavailableException unavailable(String message, Throwable cause) {
        return new ExternalServiceUnavailableException("IMAGE_EMBEDDING_UNAVAILABLE", message, cause);
    }
}

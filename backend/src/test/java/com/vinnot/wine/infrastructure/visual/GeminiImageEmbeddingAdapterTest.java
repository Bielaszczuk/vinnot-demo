package com.vinnot.wine.infrastructure.visual;

import com.sun.net.httpserver.HttpServer;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort.LabelImage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiImageEmbeddingAdapterTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final List<String> requests = Collections.synchronizedList(new ArrayList<>());
    private HttpServer server;
    private volatile int status = 200;
    private volatile String body = "";

    @AfterEach
    void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    private GeminiImageEmbeddingAdapter adapter(String key) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requests.add(exchange.getRequestURI() + "|" + exchange.getRequestHeaders().getFirst("x-goog-api-key")
                    + "|" + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        return new GeminiImageEmbeddingAdapter(mapper, "http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta",
                key, "gemini-embedding-2", 128, Duration.ofSeconds(2), Duration.ofSeconds(2));
    }

    private static String vectors(int count, int dimensions) {
        String values = String.join(",", Collections.nCopies(dimensions, "0.5"));
        return "{\"embeddings\":[" + String.join(",", Collections.nCopies(count, "{\"values\":[" + values + "]}")) + "]}";
    }

    @Test
    void embedsImagesInOneBatchWithTheKeyInAHeader() throws IOException {
        var adapter = adapter(" secret-key ");
        body = vectors(2, 128);
        List<float[]> result = adapter.embed(List.of(new LabelImage(new byte[] {1, 2}, "image/webp"),
                new LabelImage(new byte[] {3}, "image/jpeg")));

        assertThat(result).hasSize(2).allSatisfy(vector -> assertThat(vector).hasSize(128).contains(0.5f));
        String[] request = requests.getFirst().split("\\|", 3);
        assertThat(request[0]).isEqualTo("/v1beta/models/gemini-embedding-2:batchEmbedContents");
        assertThat(request[1]).isEqualTo("secret-key");
        JsonNode sent = mapper.readTree(request[2]).path("requests");
        assertThat(sent).hasSize(2);
        assertThat(sent.get(0).path("model").asString()).isEqualTo("models/gemini-embedding-2");
        assertThat(sent.get(0).path("output_dimensionality").asInt()).isEqualTo(128);
        assertThat(sent.get(1).path("content").path("parts").get(0).path("inline_data").path("mime_type").asString())
                .isEqualTo("image/jpeg");
        assertThat(adapter.isAvailable()).isTrue();
        assertThat(adapter.modelId()).isEqualTo("gemini-embedding-2");
        assertThat(adapter.dimensions()).isEqualTo(128);
        assertThat(adapter.embed(List.of())).isEmpty();
    }

    @Test
    void reportsProviderFailuresAsUnavailable() throws IOException {
        var adapter = adapter("key");
        var image = List.of(new LabelImage(new byte[] {1}, "image/png"));
        for (String limit : new String[] {"402", "429"}) {
            status = Integer.parseInt(limit);
            body = "{\"error\":{\"message\":\"private provider body\"}}";
            assertThatThrownBy(() -> adapter.embed(image)).as(limit)
                    .isInstanceOf(ExternalServiceUnavailableException.class)
                    .hasMessage("Image embedding provider answered " + limit)
                    .extracting("code").isEqualTo(WineImageEmbeddingPort.PROVIDER_LIMITED);
        }
        for (String[] answer : new String[][] {{"500", vectors(1, 128)}, {"200", "not json"},
                {"200", vectors(2, 128)}, {"200", vectors(1, 64)}, {"200", "{}"}}) {
            status = Integer.parseInt(answer[0]);
            body = answer[1];
            assertThatThrownBy(() -> adapter.embed(image)).as(answer[1])
                    .isInstanceOf(ExternalServiceUnavailableException.class)
                    .extracting("code").isEqualTo("IMAGE_EMBEDDING_UNAVAILABLE");
        }
        server.stop(0);
        server = null;
        assertThatThrownBy(() -> adapter.embed(image)).isInstanceOf(ExternalServiceUnavailableException.class);
    }

    @Test
    void validatesConfigurationAndInput() throws IOException {
        assertThatThrownBy(() -> new GeminiImageEmbeddingAdapter(mapper, "http://localhost", "k", "gemini-embedding-2",
                64, Duration.ofSeconds(1), Duration.ofSeconds(1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new GeminiImageEmbeddingAdapter(mapper, "http://localhost", "k", "../evil",
                768, Duration.ofSeconds(1), Duration.ofSeconds(1))).isInstanceOf(IllegalArgumentException.class);
        var unconfigured = new GeminiImageEmbeddingAdapter(mapper, "http://localhost/", null, "gemini-embedding-2",
                768, Duration.ofSeconds(1), Duration.ofSeconds(1));
        assertThat(unconfigured.isAvailable()).isFalse();
        var image = new LabelImage(new byte[] {1}, "image/webp");
        assertThatThrownBy(() -> unconfigured.embed(List.of(image)))
                .isInstanceOf(ExternalServiceUnavailableException.class);

        var adapter = adapter("key");
        assertThatThrownBy(() -> adapter.embed(List.of(new LabelImage(new byte[] {1}, "image/gif"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.embed(IntStream.range(0, 51).mapToObj(i -> image).toList()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

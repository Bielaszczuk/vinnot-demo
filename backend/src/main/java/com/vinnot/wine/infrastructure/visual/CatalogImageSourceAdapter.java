package com.vinnot.wine.infrastructure.visual;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.wine.application.port.out.CatalogImageSourcePort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;

/**
 * Reads label images that Vinnot hosts: catalog images from the catalog CDN over HTTPS (that host only, no
 * redirects) and labels members uploaded from file storage. Any other address is never fetched.
 */
@Component
public class CatalogImageSourceAdapter implements CatalogImageSourcePort {

    static final String CATALOG_CDN = "https://images.vinnot.com/";
    static final String MANAGED_LABELS = "/api/uploads/wine-labels/";
    private static final Logger LOGGER = LoggerFactory.getLogger(CatalogImageSourceAdapter.class);
    private static final int MAX_IMAGE_BYTES = 4 * 1024 * 1024;

    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};
    private static final int WEBP_OFFSET = 8;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private final FileStoragePort fileStorage;
    private final HttpClient httpClient;
    private final Duration timeout;

    public CatalogImageSourceAdapter(FileStoragePort fileStorage,
            @Value("${app.wine-label.visual-index.image-timeout:10s}") Duration timeout) {
        this.fileStorage = fileStorage;
        this.timeout = timeout;
        this.httpClient = HttpClient.newBuilder().connectTimeout(timeout)
                .followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override
    public Optional<WineImageEmbeddingPort.LabelImage> load(String imageUrl) {
        if (Objects.isNull(imageUrl)) {
            return Optional.empty();
        }
        try {
            if (imageUrl.startsWith(MANAGED_LABELS)) {
                return managed(imageUrl.substring(MANAGED_LABELS.length()));
            }
            if (imageUrl.startsWith(CATALOG_CDN) && !imageUrl.contains("..") && !imageUrl.contains("@")) {
                return catalog(URI.create(imageUrl));
            }
        } catch (IOException | RuntimeException exception) {
            LOGGER.debug("Label image unavailable: {}", exception.getClass().getSimpleName());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
        return Optional.empty();
    }

    private Optional<WineImageEmbeddingPort.LabelImage> managed(String filename) throws IOException {
        FileStoragePort.StoredFile file = fileStorage.loadWineLabel(filename);
        try (InputStream content = file.content()) {
            return image(content.readNBytes(MAX_IMAGE_BYTES + 1));
        }
    }

    private Optional<WineImageEmbeddingPort.LabelImage> catalog(URI uri) throws IOException, InterruptedException {
        HttpResponse<byte[]> response = httpClient.send(HttpRequest.newBuilder(uri).timeout(timeout).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
        return response.statusCode() == 200 ? image(response.body()) : Optional.empty();
    }

    /** The type comes from the bytes, never from the address or a header. */
    static Optional<WineImageEmbeddingPort.LabelImage> image(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
            return Optional.empty();
        }
        String type = contentType(bytes);
        return Objects.isNull(type) ? Optional.empty() : Optional.of(new WineImageEmbeddingPort.LabelImage(bytes, type));
    }

    private static String contentType(byte[] bytes) {
        if (startsWith(bytes, 0, RIFF) && startsWith(bytes, WEBP_OFFSET, WEBP)) {
            return "image/webp";
        }
        if (startsWith(bytes, 0, JPEG)) {
            return "image/jpeg";
        }
        return startsWith(bytes, 0, PNG) ? "image/png" : null;
    }

    private static boolean startsWith(byte[] bytes, int offset, byte[] signature) {
        return bytes.length >= offset + signature.length
                && Arrays.equals(bytes, offset, offset + signature.length, signature, 0, signature.length);
    }
}

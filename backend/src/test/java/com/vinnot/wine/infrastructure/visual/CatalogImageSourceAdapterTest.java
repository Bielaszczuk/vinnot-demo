package com.vinnot.wine.infrastructure.visual;

import com.vinnot.shared.application.port.FileStoragePort;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CatalogImageSourceAdapterTest {

    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 1};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};

    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final CatalogImageSourceAdapter adapter = new CatalogImageSourceAdapter(storage, Duration.ofSeconds(1));

    @Test
    void readsMembersUploadedLabelsFromStorageAndDetectsTheTypeFromTheBytes() {
        when(storage.loadWineLabel("wine_label_1.jpg"))
                .thenReturn(new FileStoragePort.StoredFile(new ByteArrayInputStream(JPEG), "text/plain", JPEG.length));
        assertThat(adapter.load("/api/uploads/wine-labels/wine_label_1.jpg"))
                .hasValueSatisfying(image -> assertThat(image.contentType()).isEqualTo("image/jpeg"));
        when(storage.loadWineLabel("broken.jpg")).thenThrow(new IllegalStateException("missing"));
        assertThat(adapter.load("/api/uploads/wine-labels/broken.jpg")).isEmpty();
    }

    @Test
    void neverFetchesAddressesVinnotDoesNotHost() {
        for (String url : new String[] {null, "https://images.vivino.com/x.webp", "http://images.vinnot.com/x.webp",
                "https://images.vinnot.com/../x", "https://images.vinnot.com@evil.example/x",
                "https://images.vinnot.com.evil.example/x", "/api/uploads/avatars/a.jpg"}) {
            assertThat(adapter.load(url)).as(String.valueOf(url)).isEmpty();
        }
        verify(storage, never()).loadWineLabel(anyString());
    }

    @Test
    void acceptsOnlyBoundedImagesOfKnownTypes() {
        assertThat(CatalogImageSourceAdapter.image(WEBP)).hasValueSatisfying(i -> assertThat(i.contentType()).isEqualTo("image/webp"));
        assertThat(CatalogImageSourceAdapter.image(PNG)).hasValueSatisfying(i -> assertThat(i.contentType()).isEqualTo("image/png"));
        assertThat(CatalogImageSourceAdapter.image(new byte[0])).isEmpty();
        assertThat(CatalogImageSourceAdapter.image("GIF89a".getBytes())).isEmpty();
        assertThat(CatalogImageSourceAdapter.image(new byte[4 * 1024 * 1024 + 1])).isEmpty();
    }
}

package com.vinnot.shared.application.service;

import com.vinnot.shared.application.port.FileStoragePort;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PublicUploadServiceTest {

    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final PublicUploadService service = new PublicUploadService(storage);

    @Test
    void retrievesAvatarThroughTheStoragePort() {
        var content = new ByteArrayInputStream(new byte[]{1});
        when(storage.loadAvatar("avatar.webp"))
                .thenReturn(new FileStoragePort.StoredFile(content, "image/webp", 1));

        var response = service.getAvatar("avatar.webp");

        assertThat(response.content()).isSameAs(content);
        assertThat(response.contentType()).isEqualTo("image/webp");
        assertThat(response.size()).isEqualTo(1);
        verify(storage).loadAvatar("avatar.webp");
    }

    @Test
    void retrievesWineLabelThroughTheStoragePort() {
        var content = new ByteArrayInputStream(new byte[]{1, 2});
        when(storage.loadWineLabel("label.jpg"))
                .thenReturn(new FileStoragePort.StoredFile(content, "image/jpeg", 2));

        var response = service.getWineLabel("label.jpg");

        assertThat(response.content()).isSameAs(content);
        assertThat(response.contentType()).isEqualTo("image/jpeg");
        assertThat(response.size()).isEqualTo(2);
        verify(storage).loadWineLabel("label.jpg");
    }

    @Test
    void retrievesSocialMediaThroughTheStoragePortAndKeepsMissingKeysEmpty() {
        var content = new ByteArrayInputStream(new byte[]{1, 2, 3});
        when(storage.loadSocialMedia("posts/p1/hero.png"))
                .thenReturn(Optional.of(new FileStoragePort.StoredFile(content, "image/png", 3)));
        when(storage.loadSocialMedia("posts/p1/missing.png")).thenReturn(Optional.empty());

        var response = service.getSocialMedia("posts/p1/hero.png").orElseThrow();

        assertThat(response.content()).isSameAs(content);
        assertThat(response.contentType()).isEqualTo("image/png");
        assertThat(response.size()).isEqualTo(3);
        assertThat(service.getSocialMedia("posts/p1/missing.png")).isEmpty();
    }
}

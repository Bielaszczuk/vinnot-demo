package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class StorageCleanupEffectHandlerSocialMediaTest {
    private static final String KEY = "posts/p1/ig-01-ab.jpg";
    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final SocialMediaReferences references = mock(SocialMediaReferences.class);
    private final StorageCleanupEffectHandler handler = new StorageCleanupEffectHandler(storage, jdbc, references);

    @Test
    void supportsTheSocialMediaCleanupKind() {
        assertThat(handler.supports("social-media-cleanup")).isTrue();
    }

    @Test
    void anUnreferencedObjectIsDeletedWithoutAnOwnerInThePayload() {
        when(references.isReferenced(KEY)).thenReturn(false);

        handler.execute("social-media-cleanup", Map.of("key", KEY));

        verify(storage).deleteSocialMedia(KEY);
        verifyNoInteractions(jdbc);
    }

    @Test
    void anObjectStillReferencedIsKept() {
        when(references.isReferenced(KEY)).thenReturn(true);

        handler.execute("social-media-cleanup", Map.of("key", KEY));

        verify(storage, never()).deleteSocialMedia(anyString());
    }

    @Test
    void withoutAReferenceCheckerNothingIsDeleted() {
        var unchecked = new StorageCleanupEffectHandler(storage, jdbc);

        unchecked.execute("social-media-cleanup", Map.of("key", KEY));

        verify(storage, never()).deleteSocialMedia(anyString());
    }

    @Test
    void anInvalidKeyFailsWithoutTouchingStorage() {
        assertThatThrownBy(() -> handler.execute("social-media-cleanup", Map.of("key", "../x.jpg")))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(storage, references);
    }
}

package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

class StorageCleanupEffectHandlerTest {
    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final StorageCleanupEffectHandler handler = new StorageCleanupEffectHandler(storage, jdbc);
    private final UUID owner = UUID.randomUUID();

    @Test
    void anExternalProviderPictureIsNotOursSoItsCleanupFinishesWithoutDeleting() {
        String socialPicture = "https://lh3.googleusercontent.com/a/ACg8ocJ-picture=s96-c";
        unreferenced(socialPicture);
        doThrow(new IllegalArgumentException("Avatar does not belong to user"))
                .when(storage).deleteAvatar(eq(socialPicture), eq(owner));

        handler.execute("avatar-cleanup", Map.of("owner", owner.toString(), "url", socialPicture));

        verify(storage, never()).deleteAvatar(anyString(), any());
    }

    @Test
    void anUnreferencedAvatarStoredForTheOwnerIsDeleted() {
        String stored = "https://media.vinnot.com/avatars/avatar_" + owner + "_" + UUID.randomUUID() + ".r2.webp";
        unreferenced(stored);

        handler.execute("avatar-cleanup", Map.of("owner", owner.toString(), "url", stored));

        verify(storage).deleteAvatar(stored, owner);
    }

    @Test
    void anAvatarStillInUseIsKept() {
        String stored = "/api/uploads/avatars/avatar_" + owner + "_" + UUID.randomUUID() + ".png";
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(stored))).thenReturn(true);

        handler.execute("avatar-cleanup", Map.of("owner", owner.toString(), "url", stored));

        verify(storage, never()).deleteAvatar(anyString(), any());
    }

    private void unreferenced(String url) {
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(url))).thenReturn(false);
    }
}

package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class TransactionalFileStorageAdapterSocialMediaTest {
    private static final String KEY = "posts/p1/ig-01-ab.jpg";
    private final FileStoragePort physical = mock(FileStoragePort.class);
    private final DurableEffectQueue queue = mock(DurableEffectQueue.class);
    private final TransactionalFileStorageAdapter adapter = new TransactionalFileStorageAdapter(physical, queue);

    @Test
    void anOrphanCheckSurvivingRollbackIsQueuedBeforeTheObjectIsWritten() {
        byte[] content = {1, 2, 3};
        when(physical.storeSocialMedia(KEY, content, "image/jpeg")).thenReturn("/api/uploads/social/" + KEY);

        assertThat(adapter.storeSocialMedia(KEY, content, "image/jpeg")).isEqualTo("/api/uploads/social/" + KEY);

        InOrder order = inOrder(queue, physical);
        order.verify(queue).reconcileLater(eq("social-media-cleanup"), startsWith("social-media:" + KEY + ":"), eq(Map.of("key", KEY)));
        order.verify(physical).storeSocialMedia(KEY, content, "image/jpeg");
    }

    @Test
    void deletionIsACommittedEffectInsteadOfAnImmediateDelete() {
        adapter.deleteSocialMedia(KEY);

        verify(queue).enqueue(eq("social-media-cleanup"), startsWith("social-media:" + KEY + ":"),
                eq(Map.of("key", KEY)), eq(Duration.ZERO));
        verify(physical, never()).deleteSocialMedia(anyString());
    }

    @Test
    void readsGoStraightToPhysicalStorage() {
        var file = new FileStoragePort.StoredFile(new ByteArrayInputStream(new byte[]{1}), "image/jpeg", 1);
        when(physical.loadSocialMedia(KEY)).thenReturn(Optional.of(file));

        assertThat(adapter.loadSocialMedia(KEY)).containsSame(file);
        verifyNoInteractions(queue);
    }

    @Test
    void invalidKeysAreRejectedBeforeAnyEffectIsQueued() {
        assertThatThrownBy(() -> adapter.storeSocialMedia("../x.jpg", new byte[]{1}, "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.deleteSocialMedia("a".repeat(200) + ".jpg"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(queue);
        verify(physical, never()).storeSocialMedia(anyString(), any(), anyString());
    }
}

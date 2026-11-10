package com.vinnot.shared.application.media;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import org.junit.jupiter.api.Test;
import java.io.ByteArrayInputStream;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CoverImageServiceTest {
    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final ImageOptimizationPort optimizer = mock(ImageOptimizationPort.class);
    private final CoverImageRegistryPort registry = mock(CoverImageRegistryPort.class);
    private final CurrentActorPort actor = mock(CurrentActorPort.class);
    private final CoverImageService service = new CoverImageService(storage, optimizer, registry, actor);

    @Test
    void uploadOnlyBecomesReadyAfterValidatedBytesAreStored() {
        UUID owner = UUID.randomUUID();
        when(optimizer.optimize(any(), any(), anyLong(), any())).thenReturn(new ImageOptimizationPort.OptimizedImage(new byte[]{1, 2}, 1, 1));
        var result = service.upload(new CoverImageUseCase.Upload(owner, CoverImageUseCase.Kind.EVENT, new ByteArrayInputStream(new byte[]{1}), "image/png", 1));
        var order = inOrder(registry, storage);
        order.verify(registry).stage(result.id(), owner, CoverImageUseCase.Kind.EVENT, result.imageUrl());
        order.verify(storage).storeCover(any(), eq(2L), eq(result.id()));
        order.verify(registry).markReady(result.id());
    }

    @Test
    void foreignAndWrongKindReferencesCannotBeAttachedButLegacyUrlsRemainUsable() {
        UUID id = UUID.randomUUID();
        String url = "/api/uploads/covers/" + id + ".webp";
        ResourceReader reader = new ResourceReader(UUID.randomUUID(), false);
        when(actor.current()).thenReturn(reader);
        assertThatThrownBy(() -> service.validateReference(url, null, CoverImageUseCase.Kind.EVENT)).isInstanceOf(DomainException.class);
        when(registry.permitsAttachment(id, CoverImageUseCase.Kind.EVENT, reader)).thenReturn(true);
        assertThat(service.validateReference("https://api.vinnot.com" + url, null, CoverImageUseCase.Kind.EVENT)).isEqualTo(url);
        assertThatThrownBy(() -> service.validateReference("https://evil.example" + url, null, CoverImageUseCase.Kind.EVENT)).isInstanceOf(DomainException.class);
        assertThat(service.validateReference("https://legacy.example/x.jpg", null, CoverImageUseCase.Kind.EVENT)).endsWith("x.jpg");
    }

    @Test
    void keepingAnExistingCoverStillLocksAndValidatesTheReadyReference() {
        UUID id = UUID.randomUUID();
        String url = "/api/uploads/covers/" + id + ".webp";
        when(registry.retainsExistingReference(id, CoverImageUseCase.Kind.EVENT)).thenReturn(true);
        assertThat(service.validateReference("https://api-dev.vinnot.com" + url, url, CoverImageUseCase.Kind.EVENT)).isEqualTo(url);
        verifyNoInteractions(actor);
        when(registry.retainsExistingReference(id, CoverImageUseCase.Kind.EVENT)).thenReturn(false);
        assertThatThrownBy(() -> service.validateReference(url, url, CoverImageUseCase.Kind.EVENT)).isInstanceOf(DomainException.class);
    }

    @Test
    void hiddenCoverCannotReachPhysicalStorage() {
        assertThatThrownBy(() -> service.read(UUID.randomUUID(), ResourceReader.anonymous())).isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(storage);
    }
}

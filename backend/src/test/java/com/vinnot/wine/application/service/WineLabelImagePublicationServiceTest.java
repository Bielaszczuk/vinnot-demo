package com.vinnot.wine.application.service;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class WineLabelImagePublicationServiceTest {
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final WineLabelImagePublicationService service = new WineLabelImagePublicationService(wines);
    private final Wine wine = Wine.create("Reserve", UUID.randomUUID(), WineType.RED, UUID.randomUUID());

    @Test
    void publishesOnlyWhenTheVerifiedRevisionStillHasNoImage() {
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        assertThat(service.publish(wine.getId(), wine.getRevision(), "label.jpg").attached()).isTrue();
        assertThat(wine.getImageUrl()).isEqualTo("label.jpg");
        verify(wines).save(wine);
    }

    @Test
    void preservesConcurrentImageAndRejectsChangedIdentity() {
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        assertThatThrownBy(() -> service.publish(wine.getId(), wine.getRevision() + 1, "label.jpg"))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("LABEL_IMAGE_REVIEW_REQUIRED");
        wine.updateImageUrl("other.jpg");
        var result = service.publish(wine.getId(), wine.getRevision() + 1, "label.jpg");
        assertThat(result.attached()).isFalse();
        assertThat(result.imageUrl()).isEqualTo("other.jpg");
        verify(wines, never()).save(any());
    }

    @Test
    void reportsDeletedWineAndAcceptsBlankImageAsMissing() {
        assertThatThrownBy(() -> service.publish(wine.getId(), 0, "label.jpg"))
                .isInstanceOf(EntityNotFoundException.class);
        wine.updateImageUrl(" ");
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        assertThat(service.publish(wine.getId(), wine.getRevision(), "label.jpg").attached()).isTrue();
    }
}

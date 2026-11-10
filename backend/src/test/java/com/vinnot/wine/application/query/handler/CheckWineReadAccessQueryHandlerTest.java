package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CheckWineReadAccessQueryHandlerTest {
    @Test
    void inactiveWineCannotBeReadThroughItsRelatedResourcesByUnrelatedUsers() {
        var wines = mock(WineRepositoryPort.class);
        var wine = Wine.create("Wine", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(wines.findById(wine.getId())).thenReturn(Optional.of(wine));
        var handler = new CheckWineReadAccessQueryHandler(wines);
        assertThatCode(() -> handler.check(wine.getId(), ResourceReader.anonymous())).doesNotThrowAnyException();
        wine.deactivate();
        assertThatThrownBy(() -> handler.check(wine.getId(), ResourceReader.anonymous())).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> handler.check(wine.getId(), new ResourceReader(UUID.randomUUID(), false))).isInstanceOf(EntityNotFoundException.class);
        assertThatCode(() -> handler.check(wine.getId(), ResourceReader.staff())).doesNotThrowAnyException();
        assertThatCode(() -> handler.check(wine.getId(), new ResourceReader(wine.getCreatedBy(), false))).doesNotThrowAnyException();
        assertThatThrownBy(() -> handler.check(UUID.randomUUID(), ResourceReader.staff())).isInstanceOf(EntityNotFoundException.class);
    }
}

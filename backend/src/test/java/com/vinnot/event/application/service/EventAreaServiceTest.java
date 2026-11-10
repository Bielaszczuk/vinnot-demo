package com.vinnot.event.application.service;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase.AreaView;
import com.vinnot.event.application.port.out.EventAreaRepository;
import com.vinnot.event.domain.valueobject.EventArea;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventAreaServiceTest {
    private final EventAreaRepository repository = mock(EventAreaRepository.class);
    private final EventAreaService service = new EventAreaService(repository);
    private final UUID user = UUID.randomUUID();

    @Test
    void readsStoresAndClearsTheUsersArea() {
        var view = new AreaView(AreaView.Kind.APPROXIMATE, null, null);
        when(repository.find(user)).thenReturn(Optional.of(view));
        EventArea area = EventArea.approximate(-34.6, -58.4);
        when(repository.save(user, area)).thenReturn(true);

        assertThat(service.find(user)).contains(view);
        service.set(user, area);
        service.clear(user);

        verify(repository).save(user, area);
        verify(repository).delete(user);
    }

    @Test
    void anUnknownRegionIsNotFound() {
        EventArea area = EventArea.region(UUID.randomUUID());
        when(repository.save(user, area)).thenReturn(false);
        assertThatThrownBy(() -> service.set(user, area)).isInstanceOf(EntityNotFoundException.class);
    }
}

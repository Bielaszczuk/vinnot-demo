package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.UserRepositoryPort;
import java.util.Map;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WineSubmissionAuthorQueryAdapterTest {
    @Test
    void skipsEmptyRequestsAndProjectsOnlyTheRequestedAuthorIdentity() {
        var users = mock(UserRepositoryPort.class);
        var adapter = new WineSubmissionAuthorQueryAdapter(users);
        assertThat(adapter.findAllByIds(List.of())).isEmpty();
        verifyNoInteractions(users);
        UUID id = UUID.randomUUID();
        when(users.findUsernamesByIds(List.of(id))).thenReturn(Map.of(id, "wine.author"));
        assertThat(adapter.findAllByIds(List.of(id))).singleElement().satisfies(author -> {
            assertThat(author.id()).isEqualTo(id);
            assertThat(author.username()).isEqualTo("wine.author");
        });
        verify(users).findUsernamesByIds(List.of(id));
    }
}

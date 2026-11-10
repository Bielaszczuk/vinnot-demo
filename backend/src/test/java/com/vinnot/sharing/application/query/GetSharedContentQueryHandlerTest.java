package com.vinnot.sharing.application.query;

import com.vinnot.sharing.application.port.out.SharedContentQueryPort;
import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class GetSharedContentQueryHandlerTest {
    @Test void delegatesOnlyThePublicProjectionAndPreservesAbsence() {
        var port = mock(SharedContentQueryPort.class);
        var handler = new GetSharedContentQueryHandler(port);
        var id = UUID.randomUUID();
        when(port.findPublic(SharedContentKind.EVENTS, id, true)).thenReturn(Optional.of(new SharedContent("Tasting", "Explore", null)));
        assertThat(handler.execute(SharedContentKind.EVENTS, id, true)).hasValue(new SharedContent("Tasting", "Explore", null));
        when(port.findPublic(SharedContentKind.EVENTS, id, true)).thenReturn(Optional.empty());
        assertThat(handler.execute(SharedContentKind.EVENTS, id, true)).isEmpty();
    }
}

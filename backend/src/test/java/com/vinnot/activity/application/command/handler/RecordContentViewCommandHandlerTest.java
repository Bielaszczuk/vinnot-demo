package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.command.model.RecordContentViewCommand;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import com.vinnot.activity.domain.model.ContentKind;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RecordContentViewCommandHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-20T18:30:00Z");
    private final ContentViewRepositoryPort views = mock(ContentViewRepositoryPort.class);
    private final RecordContentViewCommandHandler handler =
            new RecordContentViewCommandHandler(views, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void recordsOneViewOfTheContentAtTheCurrentTime() {
        UUID user = UUID.randomUUID();
        UUID wine = UUID.randomUUID();

        handler.execute(new RecordContentViewCommand(user, ContentKind.WINE, wine));

        verify(views).record(user, ContentKind.WINE, wine, NOW);
    }

    @Test
    void aViewNeedsItsUserKindAndContent() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> new RecordContentViewCommand(null, ContentKind.ROUTE, id))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new RecordContentViewCommand(id, null, id))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new RecordContentViewCommand(id, ContentKind.EVENT, null))
                .isInstanceOf(NullPointerException.class);
    }
}

package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.command.model.RecordContentViewCommand;
import com.vinnot.activity.application.port.in.RecordContentViewUseCase;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;

@Service
public class RecordContentViewCommandHandler implements RecordContentViewUseCase {
    private final ContentViewRepositoryPort views;
    private final Clock clock;

    @Autowired
    public RecordContentViewCommandHandler(ContentViewRepositoryPort views) {
        this(views, Clock.systemUTC());
    }

    RecordContentViewCommandHandler(ContentViewRepositoryPort views, Clock clock) {
        this.views = views;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void execute(RecordContentViewCommand command) {
        views.record(command.userId(), command.kind(), command.entityId(), clock.instant());
    }
}

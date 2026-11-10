package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

@Service
public class RecordAppOpenCommandHandler implements RecordAppOpenUseCase {
    private final AppOpenRepositoryPort opens;
    private final Duration minimumGap;
    private final Clock clock;

    @Autowired
    public RecordAppOpenCommandHandler(AppOpenRepositoryPort opens,
            @Value("${app.activity.app-open-gap:30m}") Duration minimumGap) {
        this(opens, minimumGap, Clock.systemUTC());
    }

    RecordAppOpenCommandHandler(AppOpenRepositoryPort opens, Duration minimumGap, Clock clock) {
        if (minimumGap.isNegative() || minimumGap.isZero()) {
            throw new IllegalArgumentException("app.activity.app-open-gap must be positive");
        }
        this.opens = opens;
        this.minimumGap = minimumGap;
        this.clock = clock;
    }

    @Override
    @Transactional
    public boolean execute(RecordAppOpenCommand command) {
        return opens.recordOpen(command.userId(), clock.instant(), minimumGap);
    }
}

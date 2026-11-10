package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.domain.model.PushRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class EnqueuePushService implements PushNotificationPort {
    private final PushOutboxPort outbox;
    private final Clock clock;

    @Autowired
    public EnqueuePushService(PushOutboxPort outbox) {
        this(outbox, Clock.systemUTC());
    }

    EnqueuePushService(PushOutboxPort outbox, Clock clock) {
        this.outbox = outbox;
        this.clock = clock;
    }

    @Override
    public void push(PushRequest request) {
        requireCallerKey(request);
        outbox.store(request, Duration.ZERO);
    }

    @Override
    public void schedule(List<ScheduledPush> pushes) {
        if (pushes.isEmpty()) {
            return;
        }
        Instant now = clock.instant();
        outbox.storeAll(pushes.stream().map(push -> {
            requireCallerKey(push.request());
            Duration delay = Duration.between(now, push.notBefore());
            return new PushOutboxPort.Delayed(push.request(), delay.isNegative() ? Duration.ZERO : delay);
        }).toList());
    }

    private static void requireCallerKey(PushRequest request) {
        if (request.dedupeKey().length() > PushRequest.MAX_CALLER_KEY_LENGTH) {
            throw new IllegalArgumentException("Push dedupe keys are at most " + PushRequest.MAX_CALLER_KEY_LENGTH + " characters");
        }
    }
}

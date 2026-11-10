package com.vinnot.notification.infrastructure.push;

import java.time.Duration;

/** Blocks the calling thread; a seam so tests can record waits instead of sleeping. */
@FunctionalInterface
public interface Pause {
    Pause SLEEP = duration -> Thread.sleep(duration);

    void sleep(Duration duration) throws InterruptedException;
}

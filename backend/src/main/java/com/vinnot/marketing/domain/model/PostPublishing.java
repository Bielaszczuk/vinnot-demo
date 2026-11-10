package com.vinnot.marketing.domain.model;

import java.time.Instant;

/**
 * When a post's publishing started and ended (#510), and why it failed. {@code startedAt} is null when the post failed
 * without starting (its media never got ready); {@code finishedAt} is null while it is being published.
 */
public record PostPublishing(Instant startedAt, Instant finishedAt, String error) {
}

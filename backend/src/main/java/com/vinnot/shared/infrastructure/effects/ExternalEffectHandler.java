package com.vinnot.shared.infrastructure.effects;

import java.util.Map;

/** Infrastructure strategy: execution must tolerate retries after a process restart. */
public interface ExternalEffectHandler {
    boolean supports(String kind);

    void execute(String kind, Map<String, Object> payload);

    /**
     * {@code true} (the default): the handler runs inside the job's transaction, which also holds the job's row lock,
     * so everything it writes rolls back with a failure. {@code false}: it runs outside any transaction and holds no
     * database connection between its own statements; a lease keeps other workers from claiming the job meanwhile.
     * Handlers that wait on slow providers and make their own writes durable choose {@code false}.
     */
    default boolean transactional() {
        return true;
    }
}

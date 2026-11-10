package com.vinnot.shared.infrastructure.storage;

/**
 * Tells storage cleanup whether a social-media key is still in use. The module that records rendered media (the
 * marketing render job) provides the bean; while none exists, cleanup keeps every object rather than guess.
 */
@FunctionalInterface
public interface SocialMediaReferences {

    /** True when any persisted post media still points at this key, including renders not yet committed. */
    boolean isReferenced(String key);
}

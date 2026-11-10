package com.vinnot.wine.application.port.out;

/**
 * Serializes duplicate-sensitive publication for one normalized catalog key
 * inside the current database transaction.
 */
public interface WineSubmissionLockPort {

    void lock(String wineName, String wineryName, Integer vintage);
}

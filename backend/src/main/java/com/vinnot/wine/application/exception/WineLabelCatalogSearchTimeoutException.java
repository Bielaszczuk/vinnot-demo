package com.vinnot.wine.application.exception;

/**
 * Signals that a bounded wine-label catalog lookup exhausted its latency budget.
 * Application services can degrade to a cheaper retrieval strategy without
 * depending on persistence-framework exceptions.
 */
public class WineLabelCatalogSearchTimeoutException extends RuntimeException {

    public WineLabelCatalogSearchTimeoutException(Throwable cause) {
        super("Wine-label catalog search exceeded its latency budget", cause);
    }
}

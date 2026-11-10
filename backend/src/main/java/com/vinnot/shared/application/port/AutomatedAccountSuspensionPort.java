package com.vinnot.shared.application.port;

import java.util.UUID;

/**
 * Locks an account that automated abuse detection flagged, such as an account
 * that exhausted its daily catalog quota. Implementations must be idempotent.
 */
public interface AutomatedAccountSuspensionPort {
    void suspendForCatalogScraping(UUID userId);
}

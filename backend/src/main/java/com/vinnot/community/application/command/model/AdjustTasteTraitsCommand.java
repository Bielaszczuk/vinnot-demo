package com.vinnot.community.application.command.model;

import java.util.Map;
import java.util.UUID;

/**
 * Adjust the structure bars of the member's own palate: trait key to a whole score from 0 to 100, or to {@code null}
 * to clear that trait. Traits left out stay as they are.
 */
public record AdjustTasteTraitsCommand(UUID userId, Map<?, ?> structure) { }

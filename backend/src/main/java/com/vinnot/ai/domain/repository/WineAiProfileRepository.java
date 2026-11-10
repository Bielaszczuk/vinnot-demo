package com.vinnot.ai.domain.repository;

import com.vinnot.ai.domain.model.WineAiProfile;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface WineAiProfileRepository {

    /**
     * Finds a profile by wine ID and language.
     *
     * @param wineId   the wine ID
     * @param language the language code
     * @return optional profile
     */
    Optional<WineAiProfile> findByWineIdAndLanguage(UUID wineId, String language);

    /**
     * Saves a wine AI profile.
     *
     * @param profile the profile to save
     * @return the saved profile
     */
    WineAiProfile save(WineAiProfile profile);

    /** Atomically inserts or updates every localized profile in a bundle. */
    List<WineAiProfile> saveBundle(List<WineAiProfile> profiles);

    /**
     * Deletes a profile by wine ID and language.
     *
     * @param wineId   the wine ID
     * @param language the language code
     */
    void deleteByWineIdAndLanguage(UUID wineId, String language);

    /**
     * Checks if a profile exists for wine and language.
     *
     * @param wineId   the wine ID
     * @param language the language code
     * @return true if exists
     */
    boolean existsByWineIdAndLanguage(UUID wineId, String language);

    /**
     * Pages the IDs of wines that have at least one stored profile, in ascending ID order.
     *
     * @param afterWineId exclusive cursor, or {@code null} to start from the first wine
     * @param limit       maximum IDs returned
     * @return distinct wine IDs after the cursor
     */
    List<UUID> findWineIdsAfter(UUID afterWineId, int limit);
}

package com.vinnot.ai.domain.repository;

import com.vinnot.ai.domain.model.WineComparison;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface WineComparisonRepository {

    /**
     * Finds a comparison by wine IDs and language.
     * The order of wine IDs doesn't matter - they are normalized internally.
     *
     * @param wineAId  first wine ID
     * @param wineBId  second wine ID
     * @param language the language code
     * @return optional comparison
     */
    Optional<WineComparison> findByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language);

    /**
     * Saves a wine comparison.
     *
     * @param comparison the comparison to save
     * @return the saved comparison
     */
    WineComparison save(WineComparison comparison);

    /** Atomically inserts or updates every localized comparison in a bundle. */
    List<WineComparison> saveBundle(List<WineComparison> comparisons);

    /**
     * Deletes a comparison by wine IDs and language.
     *
     * @param wineAId  first wine ID
     * @param wineBId  second wine ID
     * @param language the language code
     */
    void deleteByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language);

    /**
     * Checks if a comparison exists for wine pair and language.
     *
     * @param wineAId  first wine ID
     * @param wineBId  second wine ID
     * @param language the language code
     * @return true if exists
     */
    boolean existsByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language);
}

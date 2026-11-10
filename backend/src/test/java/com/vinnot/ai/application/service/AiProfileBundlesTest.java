package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiProfileBundlesTest {

    private static final String FINGERPRINT = "current";

    private final WineAiProfileRepository profiles = mock(WineAiProfileRepository.class);
    private final UUID wineId = UUID.randomUUID();

    @Test
    void returnsTheBundleWhenEveryLanguageMatchesTheFingerprint() {
        storeEveryLanguage("ai", FINGERPRINT);

        var bundle = AiProfileBundles.current(profiles, wineId, FINGERPRINT);

        assertThat(bundle).isPresent();
        assertThat(bundle.get()).containsOnlyKeys(AiContentLanguage.values());
    }

    @Test
    void isEmptyWhenAnyLanguageCarriesAnOlderFingerprint() {
        storeEveryLanguage("ai", FINGERPRINT);
        store(AiContentLanguage.values()[0], "ai", "older");

        assertThat(AiProfileBundles.current(profiles, wineId, FINGERPRINT)).isEmpty();
    }

    @Test
    void isEmptyWhenALanguageIsMissing() {
        storeEveryLanguage("ai", FINGERPRINT);
        when(profiles.findByWineIdAndLanguage(wineId, AiContentLanguage.values()[0].code()))
                .thenReturn(Optional.empty());

        assertThat(AiProfileBundles.current(profiles, wineId, FINGERPRINT)).isEmpty();
    }

    @Test
    void manualProfilesStayCurrentWhateverTheirFingerprint() {
        storeEveryLanguage("manual", "older");

        assertThat(AiProfileBundles.current(profiles, wineId, FINGERPRINT)).isPresent();
    }

    @Test
    void profilesWithoutProvenanceAreNotCurrent() {
        for (AiContentLanguage language : AiContentLanguage.values()) {
            when(profiles.findByWineIdAndLanguage(wineId, language.code())).thenReturn(Optional.of(
                    WineAiProfile.create(wineId, language.code(), Map.of("summary", "Texto"))));
        }

        assertThat(AiProfileBundles.current(profiles, wineId, FINGERPRINT)).isEmpty();
    }

    private void storeEveryLanguage(String source, String fingerprint) {
        for (AiContentLanguage language : AiContentLanguage.values()) {
            store(language, source, fingerprint);
        }
    }

    private void store(AiContentLanguage language, String source, String fingerprint) {
        when(profiles.findByWineIdAndLanguage(wineId, language.code())).thenReturn(Optional.of(
                WineAiProfile.create(wineId, language.code(),
                        AiContentProvenance.stamp(Map.of("summary", "Texto"), source, fingerprint))));
    }
}

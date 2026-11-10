package com.vinnot.ai.infrastructure.query;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class StoredWineProfileOverviewAdapterTest {
    private final WineAiProfileRepository repository = mock(WineAiProfileRepository.class);
    private final StoredWineProfileOverviewAdapter adapter = new StoredWineProfileOverviewAdapter(repository);

    @Test
    void readsBothSavedLanguagesIncludingZeroAndNeverWritesOrGenerates() {
        UUID id = UUID.randomUUID();
        for (String locale : List.of("es", "en")) {
            when(repository.findByWineIdAndLanguage(id, locale)).thenReturn(Optional.of(WineAiProfile.create(id, locale,
                    Map.of("summary", "Summary " + locale, "palateAnalysis", Map.of("acidityScore", 65,
                            "tanninScore", 0, "bodyScore", 70.4, "sweetnessScore", 5),
                            "foodPairings", Map.of("pairings", List.of(" Lamb ", "", 123))))));
        }
        var result = adapter.findByWineId(id);
        assertThat(result).containsOnlyKeys("es", "en");
        assertThat(result.get("es").summary()).isEqualTo("Summary es");
        assertThat(result.get("en").summary()).isEqualTo("Summary en");
        assertThat(result.get("es").tanninScore()).isZero();
        assertThat(result.get("es").sweetnessScore()).isEqualTo(5);
        assertThat(result.get("es").bodyScore()).isEqualTo(70);
        assertThat(result.get("es").acidityScore()).isEqualTo(65);
        assertThat(result.get("es").foodPairings()).containsExactly("Lamb");
        verify(repository).findByWineIdAndLanguage(id, "es");
        verify(repository).findByWineIdAndLanguage(id, "en");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void toleratesMissingAndMalformedHistoricalContentWithoutFabricatingScores() {
        UUID id = UUID.randomUUID();
        assertThat(adapter.findByWineId(id)).isEmpty();
        when(repository.findByWineIdAndLanguage(id, "es")).thenReturn(Optional.of(WineAiProfile.create(id, "es", null)));
        assertThat(adapter.findByWineId(id)).isEmpty();
        when(repository.findByWineIdAndLanguage(id, "es")).thenReturn(Optional.of(WineAiProfile.create(id, "es",
                Map.of("summary", 3, "palateAnalysis", "invalid", "foodPairings", Map.of("pairings", "invalid")))));
        var missing = adapter.findByWineId(id).get("es");
        assertThat(missing.summary()).isNull();
        assertThat(missing.acidityScore()).isNull();
        assertThat(missing.foodPairings()).isEmpty();
        when(repository.findByWineIdAndLanguage(id, "es")).thenReturn(Optional.of(WineAiProfile.create(id, "es",
                Map.of("palateAnalysis", Map.of("acidityScore", Double.NaN, "bodyScore", 101,
                        "tanninScore", -1, "sweetnessScore", "5")))));
        var invalid = adapter.findByWineId(id).get("es");
        assertThat(invalid.acidityScore()).isNull();
        assertThat(invalid.bodyScore()).isNull();
        assertThat(invalid.tanninScore()).isNull();
        assertThat(invalid.sweetnessScore()).isNull();
    }
}

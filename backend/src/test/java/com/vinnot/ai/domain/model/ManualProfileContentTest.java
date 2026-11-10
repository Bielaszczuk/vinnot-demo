package com.vinnot.ai.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import java.util.LinkedHashMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ManualProfileContentTest {
    @Test
    void retainsContentAndExcludesResponseMetadata() {
        var result = ManualProfileContent.validate(Map.of("summary", "Reserva", "wineId", "id",
                "fromCache", true, "palateAnalysis", Map.of("bodyScore", 0), "idealOccasions", List.of("Dinner")));
        assertThat(result).containsKey("palateAnalysis").doesNotContainKeys("wineId", "fromCache");
    }

    @Test
    void rejectsMalformedSectionsListsAndOutOfRangeScores() {
        for (var malformed : List.of(Map.of("summary", 3), Map.of("summary", ""),
                Map.of("summary", "Text", "palateAnalysis", "bad"),
                Map.of("summary", "Text", "palateAnalysis", Map.of("bodyScore", 101)),
                Map.of("summary", "Text", "idealOccasions", List.of(3)))) {
            assertThatThrownBy(() -> ManualProfileContent.validate(new LinkedHashMap<>(malformed))).isInstanceOf(DomainException.class);
        }
    }
}

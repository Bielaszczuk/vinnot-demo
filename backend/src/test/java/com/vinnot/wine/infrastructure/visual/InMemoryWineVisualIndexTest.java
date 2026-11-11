package com.vinnot.wine.infrastructure.visual;

import com.vinnot.wine.application.port.out.WineVisualIndexPort.VisualMatch;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class InMemoryWineVisualIndexTest {

    @Test
    void ranksByCosineSimilarityAfterQuantization() {
        var index = new InMemoryWineVisualIndex(3);
        UUID same = UUID.randomUUID();
        UUID close = UUID.randomUUID();
        UUID opposite = UUID.randomUUID();
        index.put(same, new float[] {2, 0, 0});
        index.put(close, new float[] {1, 1, 0});
        index.put(opposite, new float[] {-1, 0, 0});

        List<VisualMatch> matches = index.nearest(new float[] {5, 0, 0}, 2);
        assertThat(matches).extracting(VisualMatch::wineId).containsExactly(same, close);
        assertThat(matches.get(0).similarity()).isCloseTo(1.0, within(0.01));
        assertThat(matches.get(1).similarity()).isCloseTo(0.7071, within(0.01));
        assertThat(index.nearest(new float[] {1, 0, 0}, 0)).isEmpty();
        assertThat(index.size()).isEqualTo(3);
    }

    @Test
    void replacesRemovesAndGrowsBeyondItsInitialCapacity() {
        var index = new InMemoryWineVisualIndex(8);
        Random random = new Random(544);
        UUID first = null;
        for (int i = 0; i < 1500; i++) {
            float[] vector = new float[8];
            for (int d = 0; d < 8; d++) {
                vector[d] = random.nextFloat() - 0.5f;
            }
            UUID wine = UUID.randomUUID();
            first = first == null ? wine : first;
            index.put(wine, vector);
        }
        assertThat(index.size()).isEqualTo(1500);
        float[] target = {1, 1, 1, 1, 1, 1, 1, 1};
        index.put(first, target);
        assertThat(index.size()).isEqualTo(1500);
        assertThat(index.nearest(target, 1).getFirst().wineId()).isEqualTo(first);

        index.remove(first);
        index.remove(UUID.randomUUID());
        assertThat(index.size()).isEqualTo(1499);
        assertThat(index.nearest(target, 1500)).hasSize(1499).extracting(VisualMatch::wineId).doesNotContain(first);
    }

    @Test
    void removesTheLastRowWithoutMovingAnother() {
        var index = new InMemoryWineVisualIndex(2);
        UUID kept = UUID.randomUUID();
        UUID last = UUID.randomUUID();
        index.put(kept, new float[] {1, 0});
        index.put(last, new float[] {0, 1});
        index.remove(last);
        assertThat(index.nearest(new float[] {0, 1}, 5)).extracting(VisualMatch::wineId).containsExactly(kept);
    }

    @Test
    void rejectsInvalidDimensionsAndVectors() {
        assertThatThrownBy(() -> new InMemoryWineVisualIndex(0)).isInstanceOf(IllegalArgumentException.class);
        var index = new InMemoryWineVisualIndex(2);
        assertThatThrownBy(() -> index.put(UUID.randomUUID(), new float[] {1, 0, 0}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> index.put(UUID.randomUUID(), new float[] {0, 0}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> index.put(UUID.randomUUID(), null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> index.put(null, new float[] {1, 0})).isInstanceOf(NullPointerException.class);
    }

    @Test
    void quantizationRoundTripsToTheSameBytes() {
        var quantized = Int8Vectors.quantize(new float[] {0.3f, -0.9f, 0.1f}, 3);
        assertThat(quantized.values()).containsExactly(42, -127, 14);
        var again = Int8Vectors.quantize(Int8Vectors.restore(quantized.values(), quantized.scale()), 3);
        assertThat(again.values()).containsExactly(quantized.values());
        assertThatThrownBy(() -> Int8Vectors.quantize(new float[] {Float.NaN, 1}, 2))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

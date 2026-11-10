package com.vinnot.marketing.infrastructure.render;

import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Missing or broken artwork degrades to nothing; pillar codes never escape the vignette folder. */
class RenderAssetsTest {

    @Test
    void presentAssetsAreDecodedWithTheirAlpha() {
        RenderAssets assets = SyntheticAssets.complete();

        assertThat(assets.paper()).hasValueSatisfying(image -> assertThat(image.getWidth()).isEqualTo(200));
        assertThat(assets.ornament(RenderAssets.Ornament.DIVIDER))
                .hasValueSatisfying(image -> assertThat(image.getColorModel().hasAlpha()).isTrue());
        assertThat(assets.vignette("PAIRING")).isPresent();
    }

    @Test
    void missingBrokenOrUnreadableAssetsAreEmpty() {
        RenderAssets missing = SyntheticAssets.none();
        RenderAssets broken = new RenderAssets(path -> new ByteArrayInputStream(new byte[] {9, 9, 9}));
        RenderAssets failing = new RenderAssets(path -> {
            throw new IOException("unreadable");
        });

        assertThat(missing.paper()).isEmpty();
        assertThat(missing.vignette("QUIZ")).isEmpty();
        assertThat(broken.ornament(RenderAssets.Ornament.LEAF)).isEmpty();
        assertThat(broken.paper()).isEmpty();
        assertThat(failing.paper()).isEmpty();
    }

    @Test
    void pillarCodesOutsideTheCatalogueShapeAreNeverLookedUp() {
        List<String> requested = new ArrayList<>();
        RenderAssets assets = new RenderAssets(path -> {
            requested.add(path);
            return null;
        });

        assertThat(assets.vignette("../../application")).isEmpty();
        assertThat(assets.vignette("quiz")).isEmpty();
        assertThat(assets.vignette("WINE_DAY")).isEmpty();
        assertThat(requested).hasSize(9).allMatch(path -> path.matches("marketing/render/vignettes/WINE_DAY-[1-9]\\.png"));
    }

    @Test
    void theSeedPicksOneOfThePillarVignettesAndAlwaysTheSameOne() {
        byte[] png = SyntheticAssets.png(new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB));
        List<String> opened = new ArrayList<>();
        RenderAssets assets = new RenderAssets(path -> {
            boolean present = path.endsWith("QUIZ-2.png") || path.endsWith("QUIZ-5.png");
            if (present) {
                opened.add(path);
            }
            return present ? new ByteArrayInputStream(png) : null;
        });

        assertThat(assets.vignette("QUIZ", 0)).isPresent();
        assertThat(assets.vignette("QUIZ", 1)).isPresent();
        assertThat(assets.vignette("QUIZ", -1)).isPresent();
        assertThat(assets.vignette("QUIZ", 2)).isPresent();

        // The first lookup probes both files once; then each seed loads the vignette it maps to.
        assertThat(opened.subList(2, 6)).containsExactly(
                "marketing/render/vignettes/QUIZ-2.png", "marketing/render/vignettes/QUIZ-5.png",
                "marketing/render/vignettes/QUIZ-5.png", "marketing/render/vignettes/QUIZ-2.png");
    }

    @Test
    void everyBundledPillarHasSeveralVignettes() {
        RenderAssets bundled = new RenderAssets();
        List<String> pillars = List.of("WINE_DAY", "CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY", "QUIZ", "PAIRING", "GRAPE_OF_MONTH",
                "HUMOR", "APP_FEATURE", "TERROIR", "WINEMAKING", "HISTORY", "REGION", "TASTING", "SERVICE");

        for (String pillar : pillars) {
            for (int seed = 0; seed < 3; seed++) {
                assertThat(bundled.vignette(pillar, seed)).as(pillar + " seed " + seed).isPresent();
            }
        }
        assertThat(RenderAssets.class.getClassLoader().getResource("marketing/render/vignettes/PAIRING-1.png"))
                .as("the street-food pairing vignette is gone").isNull();
    }

    @Test
    void theBundledClasspathSourceServesTheFontsFolder() {
        assertThat(SlideFonts.bundled().display().getFamily()).contains("Cormorant Garamond");
        assertThat(SlideFonts.bundled().body().getFamily()).isEqualTo("Poppins");
    }
}

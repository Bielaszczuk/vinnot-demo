package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.model.RenderedSlide;
import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.model.SlideFormat;
import com.vinnot.marketing.application.port.out.SlideRenderer;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S4 carousel rendering through the {@link SlideRenderer} port: cover, one card per slide, closing card. */
class Java2dSlideRendererTest {
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("La uva insignia", "El Malbec llegó a Mendoza en 1853."),
            new PostCopy.Slide("Altura y sol", "Los viñedos de altura dan vinos intensos y frescos."),
            new PostCopy.Slide("¿Con qué va?", "Un asado, una empanada o una tarde de amigos."));

    private final SlideRenderer renderer = new Java2dSlideRenderer(SyntheticAssets.complete());

    @ParameterizedTest
    @EnumSource(SlideFormat.class)
    void rendersTheCoverEveryCardAndTheClosingAtTheExactSize(SlideFormat format) {
        List<RenderedSlide> slides = renderer.render(deck(SyntheticAssets.illustration()), format);

        assertThat(slides).hasSize(SLIDES.size() + 2);
        assertThat(slides).extracting(RenderedSlide::index).containsExactly(0, 1, 2, 3, 4);
        for (RenderedSlide slide : slides) {
            BufferedImage image = decode(slide);
            assertThat(slide.width()).isEqualTo(format.width());
            assertThat(slide.height()).isEqualTo(format.height());
            assertThat(image.getWidth()).isEqualTo(format.width());
            assertThat(image.getHeight()).isEqualTo(format.height());
            assertThat(image.getColorModel().hasAlpha()).isFalse();
            assertThat(darkPixels(image)).as("text drawn on slide %d", slide.index()).isGreaterThan(500);
        }
    }

    @ParameterizedTest
    @EnumSource(SlideFormat.class)
    void copyAtItsLimitsFitsEveryFormat(SlideFormat format) {
        List<PostCopy.Slide> longest = IntStream.range(0, PostCopy.SLIDES_MAX)
                .mapToObj(index -> new PostCopy.Slide(words(PostCopy.SLIDE_TITLE_MAX), words(PostCopy.SLIDE_BODY_MAX))).toList();
        SlideDeck deck = new SlideDeck(words(PostCopy.HOOK_MAX), longest, words(PostCopy.CTA_MAX), PostLanguage.ES.legalLine(),
                SyntheticAssets.illustration(), "QUIZ", "es");

        assertThat(renderer.render(deck, format)).hasSize(PostCopy.SLIDES_MAX + 2);
    }

    @Test
    void wideGlyphsWithoutSpacesStillFit() {
        List<PostCopy.Slide> wide = List.of(new PostCopy.Slide("W".repeat(40), "W".repeat(160)), SLIDES.get(1), SLIDES.get(2));
        SlideDeck deck = new SlideDeck("M".repeat(60), wide, "W".repeat(200), PostLanguage.ES.legalLine(), null, "QUIZ", "es");

        assertThat(renderer.render(deck, SlideFormat.TIKTOK)).hasSize(5);
    }

    @Test
    void theCoverUsesTheIllustrationWhenGivenAndThePillarVignetteOtherwise() {
        BufferedImage withIllustration = decode(renderer.render(deck(SyntheticAssets.illustration()), SlideFormat.INSTAGRAM).get(0));
        BufferedImage withVignette = decode(renderer.render(deck(null), SlideFormat.INSTAGRAM).get(0));

        assertThat(countNear(withIllustration, SyntheticAssets.ILLUSTRATION)).isGreaterThan(10_000);
        assertThat(countNear(withIllustration, SyntheticAssets.VIGNETTE)).isZero();
        assertThat(countNear(withVignette, SyntheticAssets.VIGNETTE)).isGreaterThan(10_000);
        assertThat(countNear(withVignette, SyntheticAssets.ILLUSTRATION)).isZero();
    }

    @Test
    void theArtSeedPicksAnotherVignetteOfThePillar() {
        SlideDeck first = new SlideDeck("Hook", List.of(new PostCopy.Slide("Title", "Body")), "Cta", PostLanguage.ES.legalLine(), null,
                "QUIZ", "es", 0);
        SlideDeck second = new SlideDeck("Hook", List.of(new PostCopy.Slide("Title", "Body")), "Cta", PostLanguage.ES.legalLine(), null,
                "QUIZ", "es", 1);

        BufferedImage firstCover = decode(renderer.render(first, SlideFormat.INSTAGRAM).get(0));
        BufferedImage secondCover = decode(renderer.render(second, SlideFormat.INSTAGRAM).get(0));

        assertThat(countNear(firstCover, SyntheticAssets.VIGNETTE)).isGreaterThan(10_000);
        assertThat(countNear(firstCover, SyntheticAssets.SECOND_VIGNETTE)).isZero();
        assertThat(countNear(secondCover, SyntheticAssets.SECOND_VIGNETTE)).isGreaterThan(10_000);
        assertThat(countNear(secondCover, SyntheticAssets.VIGNETTE)).isZero();
    }

    @ParameterizedTest
    @EnumSource(SlideFormat.class)
    void missingAssetsDegradeToThePlainCreamCanvas(SlideFormat format) {
        List<RenderedSlide> slides = new Java2dSlideRenderer(SyntheticAssets.none()).render(deck(null), format);

        assertThat(slides).hasSize(5);
        BufferedImage cover = decode(slides.get(0));
        assertThat(distance(new Color(cover.getRGB(5, 5)), SlidePalette.CREAM)).isLessThan(12);
        assertThat(darkPixels(cover)).isGreaterThan(500);
    }

    @Test
    void emojiAndSpanishPunctuationNeverBreakTheRender() {
        SlideDeck deck = new SlideDeck("¿Sabías qué? 🍷 ¡Salud!", SLIDES, "Contanos 👇 ¿cuál es tu favorito?", PostLanguage.ES.legalLine(),
                null, "CURIOUS_FACT", "es");

        assertThat(renderer.render(deck, SlideFormat.INSTAGRAM)).hasSize(5);
    }

    @Test
    void textBeyondEveryBoxFailsAsTextDoesNotFit() {
        SlideDeck deck = new SlideDeck("palabra ".repeat(300), SLIDES, "Contanos", PostLanguage.ES.legalLine(), null, "QUIZ", "es");

        assertThatThrownBy(() -> renderer.render(deck, SlideFormat.INSTAGRAM)).isInstanceOfSatisfying(
                SlideRenderer.SlideRenderingException.class,
                exception -> assertThat(exception.reason()).isEqualTo(SlideRenderer.Reason.TEXT_DOES_NOT_FIT));
    }

    @Test
    void anIllustrationThatCannotBeDecodedFailsClearly() {
        assertThatThrownBy(() -> renderer.render(deck(new byte[] {1, 2, 3}), SlideFormat.INSTAGRAM))
                .isInstanceOfSatisfying(SlideRenderer.SlideRenderingException.class,
                        exception -> assertThat(exception.reason()).isEqualTo(SlideRenderer.Reason.INVALID_ILLUSTRATION));
    }

    @Test
    void anEncoderFailureSurfacesAndReleasesTheRenderer() {
        boolean[] fail = {true};
        SlideEncoder flaky = image -> {
            if (fail[0]) {
                throw new IOException("disk full");
            }
            return SlideEncoder.jpeg(0.9f).encode(image);
        };
        SlideRenderer failing = new Java2dSlideRenderer(SyntheticAssets.none(), flaky, Duration.ofMillis(50));

        assertThatThrownBy(() -> failing.render(deck(null), SlideFormat.INSTAGRAM))
                .isInstanceOfSatisfying(SlideRenderer.SlideRenderingException.class,
                        exception -> assertThat(exception.reason()).isEqualTo(SlideRenderer.Reason.ENCODING_FAILED))
                .hasRootCauseMessage("disk full");
        fail[0] = false;
        assertThat(failing.render(deck(null), SlideFormat.INSTAGRAM)).hasSize(5);
    }

    @Test
    void aSecondRenderWhileOneIsRunningFailsAsBusy() throws Exception {
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        RenderAssets blocking = new RenderAssets(path -> {
            started.countDown();
            awaitQuietly(release);
            return null;
        });
        SlideRenderer busy = new Java2dSlideRenderer(blocking, SlideEncoder.jpeg(0.9f), Duration.ofMillis(50));
        CompletableFuture<List<RenderedSlide>> first = CompletableFuture.supplyAsync(() -> busy.render(deck(null), SlideFormat.INSTAGRAM));
        try {
            assertThat(started.await(10, TimeUnit.SECONDS)).isTrue();

            assertThatThrownBy(() -> busy.render(deck(null), SlideFormat.INSTAGRAM))
                    .isInstanceOfSatisfying(SlideRenderer.SlideRenderingException.class,
                            exception -> assertThat(exception.reason()).isEqualTo(SlideRenderer.Reason.BUSY));
        } finally {
            release.countDown();
        }
        assertThat(first.get(30, TimeUnit.SECONDS)).hasSize(5);
    }

    private static SlideDeck deck(byte[] illustration) {
        return new SlideDeck("El Malbec, la uva que nos representa", SLIDES, "¿Cuál es tu Malbec favorito? Contanos.",
                PostLanguage.ES.legalLine(), illustration, "WINE_DAY", "es");
    }

    /** Realistic Spanish words up to exactly {@code length} characters. */
    private static String words(int length) {
        String source = "Mendoza guarda viñedos de altura donde el Malbec madura lento bajo un sol intenso y noches frescas. ".repeat(4);
        return source.substring(0, length).strip();
    }

    private static BufferedImage decode(RenderedSlide slide) {
        try (InputStream input = new ByteArrayInputStream(slide.jpeg())) {
            byte[] bytes = slide.jpeg();
            assertThat(bytes[0]).isEqualTo((byte) 0xFF);
            assertThat(bytes[1]).isEqualTo((byte) 0xD8);
            BufferedImage image = ImageIO.read(input);
            assertThat(image).isNotNull();
            return image;
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private static int darkPixels(BufferedImage image) {
        int count = 0;
        for (int y = 0; y < image.getHeight(); y += 2) {
            for (int x = 0; x < image.getWidth(); x += 2) {
                Color color = new Color(image.getRGB(x, y));
                if (color.getRed() + color.getGreen() + color.getBlue() < 300) {
                    count++;
                }
            }
        }
        return count;
    }

    private static int countNear(BufferedImage image, Color target) {
        int count = 0;
        for (int y = 0; y < image.getHeight(); y += 2) {
            for (int x = 0; x < image.getWidth(); x += 2) {
                if (distance(new Color(image.getRGB(x, y)), target) < 40) {
                    count++;
                }
            }
        }
        return count;
    }

    private static int distance(Color first, Color second) {
        return Math.abs(first.getRed() - second.getRed()) + Math.abs(first.getGreen() - second.getGreen())
                + Math.abs(first.getBlue() - second.getBlue());
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}

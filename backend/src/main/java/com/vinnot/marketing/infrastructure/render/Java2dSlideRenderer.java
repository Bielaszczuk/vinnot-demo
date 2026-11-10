package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.model.RenderedSlide;
import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.model.SlideFormat;
import com.vinnot.marketing.application.port.out.SlideRenderer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.UnaryOperator;

/**
 * Renders carousels with headless Java2D (#492). One deck at a time: the host runs with a 512MB heap, so a second render
 * waits briefly for the single permit and then fails as {@link Reason#BUSY}. Slides are painted and encoded one after
 * another and every canvas is released right after its JPEG is written.
 */
@Component
public class Java2dSlideRenderer implements SlideRenderer {
    private static final float JPEG_QUALITY = 0.9f;
    private static final Duration DEFAULT_WAIT = Duration.ofSeconds(20);

    private final RenderAssets assets;
    private final SlideFonts fonts;
    private final SlideEncoder encoder;
    private final Duration wait;
    private final Semaphore permit = new Semaphore(1);

    @Autowired
    public Java2dSlideRenderer(RenderAssets assets) {
        this(assets, SlideEncoder.jpeg(JPEG_QUALITY), DEFAULT_WAIT);
    }

    Java2dSlideRenderer(RenderAssets assets, SlideEncoder encoder, Duration wait) {
        this.assets = Objects.requireNonNull(assets, "assets");
        this.encoder = Objects.requireNonNull(encoder, "encoder");
        this.wait = Objects.requireNonNull(wait, "wait");
        this.fonts = SlideFonts.bundled();
    }

    @Override
    public List<RenderedSlide> render(SlideDeck deck, SlideFormat format) {
        Objects.requireNonNull(deck, "deck");
        Objects.requireNonNull(format, "format");
        acquire();
        try {
            SlideGeometry geometry = SlideGeometry.of(format);
            DeckArt art = prepare(deck, geometry);
            try {
                SlidePainter painter = new SlidePainter(geometry, fonts, art);
                List<RenderedSlide> slides = new ArrayList<>(deck.slideCount());
                slides.add(paint(0, geometry, graphics -> painter.cover(graphics, deck)));
                for (int index = 0; index < deck.slides().size(); index++) {
                    int position = index + 1;
                    slides.add(paint(position, geometry,
                            graphics -> painter.content(graphics, deck.slides().get(position - 1), position, deck.slides().size())));
                }
                slides.add(paint(deck.slideCount() - 1, geometry, graphics -> painter.closing(graphics, deck)));
                return List.copyOf(slides);
            } finally {
                art.flush();
            }
        } finally {
            permit.release();
        }
    }

    private void acquire() {
        try {
            if (!permit.tryAcquire(wait.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new SlideRenderingException(Reason.BUSY, "Another carousel is being rendered; try again shortly");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new SlideRenderingException(Reason.INTERRUPTED, "Interrupted while waiting to render a carousel", exception);
        }
    }

    private RenderedSlide paint(int index, SlideGeometry geometry, Consumer<Graphics2D> layout) {
        BufferedImage canvas = new BufferedImage(geometry.width(), geometry.height(), BufferedImage.TYPE_INT_RGB);
        try {
            Graphics2D graphics = canvas.createGraphics();
            try {
                applyQualityHints(graphics);
                layout.accept(graphics);
            } finally {
                graphics.dispose();
            }
            return new RenderedSlide(index, encoder.encode(canvas), geometry.width(), geometry.height());
        } catch (IOException exception) {
            throw new SlideRenderingException(Reason.ENCODING_FAILED, "Slide " + index + " could not be encoded as JPEG", exception);
        } finally {
            canvas.flush();
        }
    }

    private DeckArt prepare(SlideDeck deck, SlideGeometry geometry) {
        BufferedImage background = assets.paper().map(paper -> scaled(paper, image ->
                ImageScaling.cover(image, geometry.width(), geometry.height()))).orElseGet(() -> plain(geometry));
        int coverHeight = (int) Math.round(geometry.safeHeight() * SlidePainter.COVER_IMAGE_SHARE);
        BufferedImage cover = heroImage(deck).map(image -> scaled(image, source -> ImageScaling.fit(source, geometry.safeWidth(),
                coverHeight))).orElse(null);
        return new DeckArt(background, cover,
                ornament(RenderAssets.Ornament.CORNER_LEFT, SlidePainter.CORNER_SIZE, SlidePainter.CORNER_SIZE),
                ornament(RenderAssets.Ornament.CORNER_RIGHT, SlidePainter.CORNER_SIZE, SlidePainter.CORNER_SIZE),
                ornament(RenderAssets.Ornament.DIVIDER, SlidePainter.DIVIDER_WIDTH, SlidePainter.DIVIDER_HEIGHT),
                ornament(RenderAssets.Ornament.SPRIG, SlidePainter.SPRIG_WIDTH, SlidePainter.SPRIG_HEIGHT));
    }

    private Optional<BufferedImage> heroImage(SlideDeck deck) {
        if (!deck.hasIllustration()) {
            return assets.vignette(deck.pillarCode(), deck.artSeed());
        }
        try {
            return Optional.of(RenderAssets.decode(deck.illustrationPng()));
        } catch (IOException | RuntimeException exception) {
            throw new SlideRenderingException(Reason.INVALID_ILLUSTRATION, "The post illustration cannot be decoded", exception);
        }
    }

    private BufferedImage ornament(RenderAssets.Ornament ornament, int maxWidth, int maxHeight) {
        return assets.ornament(ornament).map(image -> scaled(image, source -> ImageScaling.fit(source, maxWidth, maxHeight))).orElse(null);
    }

    /** Applies {@code transform} and releases the decoded source right away. */
    private static BufferedImage scaled(BufferedImage source, UnaryOperator<BufferedImage> transform) {
        try {
            return transform.apply(source);
        } finally {
            source.flush();
        }
    }

    private static BufferedImage plain(SlideGeometry geometry) {
        BufferedImage canvas = new BufferedImage(geometry.width(), geometry.height(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            graphics.setColor(SlidePalette.CREAM);
            graphics.fillRect(0, 0, geometry.width(), geometry.height());
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    private static void applyQualityHints(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        graphics.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);
    }
}

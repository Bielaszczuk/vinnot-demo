package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.port.out.SlideRenderer;
import com.vinnot.marketing.domain.model.PostCopy;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Lays out the three slide kinds of #492 on a prepared canvas: the cover (hero image, hook, wordmark), the content cards
 * (progress marker, title, divider, body, corner flourishes) and the closing card (call to action, wordmark, legal line).
 * Every text box is sized from the safe area and shrinks its text to fit; blocks are centred vertically.
 */
final class SlidePainter {
    static final String WORDMARK = "vinnot";
    /** Height share of the safe area the cover illustration may take. */
    static final double COVER_IMAGE_SHARE = 0.54;
    static final int CORNER_SIZE = 280;
    static final int DIVIDER_WIDTH = 360;
    static final int DIVIDER_HEIGHT = 64;
    static final int SPRIG_WIDTH = 300;
    static final int SPRIG_HEIGHT = 180;

    private static final int CORNER_INSET = 34;
    private static final float LARGE_WORDMARK = 64f;
    private static final float SMALL_WORDMARK = 40f;
    private static final float WORDMARK_TRACKING = 0.02f;
    private static final float MARKER_SIZE = 26f;
    private static final float MARKER_TRACKING = 0.14f;

    private static final TextStyle HOOK = new TextStyle(108, 52, 0.92f);
    private static final TextStyle TITLE = new TextStyle(96, 44, 0.92f);
    private static final TextStyle BODY = new TextStyle(50, 28, 1.0f);
    private static final TextStyle CTA = new TextStyle(80, 38, 0.92f);
    private static final TextStyle LEGAL = new TextStyle(24, 18, 1.0f);

    private static final float HOOK_SHARE_WITH_IMAGE = 0.36f;
    private static final float HOOK_SHARE_ALONE = 0.62f;
    private static final float TITLE_SHARE = 0.36f;
    private static final float BODY_SHARE = 0.46f;
    private static final float CTA_SHARE = 0.62f;
    private static final float LEGAL_MAX_HEIGHT = 110f;

    private static final float GAP_SMALL = 36f;
    private static final float GAP = 44f;
    private static final float GAP_LARGE = 56f;

    private final SlideGeometry geometry;
    private final SlideFonts fonts;
    private final DeckArt art;

    SlidePainter(SlideGeometry geometry, SlideFonts fonts, DeckArt art) {
        this.geometry = geometry;
        this.fonts = fonts;
        this.art = art;
    }

    void cover(Graphics2D graphics, SlideDeck deck) {
        graphics.drawImage(art.background(), 0, 0, null);
        FittedText wordmark = TextFitter.line(WORDMARK, fonts.display(), LARGE_WORDMARK, WORDMARK_TRACKING);
        float wordmarkTop = geometry.safeBottom() - wordmark.height();
        wordmark.drawCentered(graphics, SlidePalette.WINE, geometry.left(), wordmarkTop, geometry.safeWidth());

        float regionBottom = wordmarkTop - GAP_LARGE;
        float region = regionBottom - geometry.top();
        boolean image = Objects.nonNull(art.cover());
        FittedText hook = fit(deck.hook(), fonts.display(), HOOK, region * (image ? HOOK_SHARE_WITH_IMAGE : HOOK_SHARE_ALONE));
        List<Block> under = new ArrayList<>();
        under.add(text(hook, SlidePalette.SEPIA));
        if (Objects.nonNull(art.divider())) {
            under.add(gap(GAP_SMALL));
            under.add(image(art.divider()));
        }
        List<Block> blocks = new ArrayList<>();
        if (image) {
            float room = region - height(under) - GAP;
            blocks.add(image(art.cover(), room));
            blocks.add(gap(GAP));
        }
        blocks.addAll(under);
        stack(graphics, blocks, geometry.top(), regionBottom);
    }

    void content(Graphics2D graphics, PostCopy.Slide slide, int position, int total) {
        graphics.drawImage(art.background(), 0, 0, null);
        corners(graphics);
        FittedText marker = TextFitter.line(position + " / " + total, fonts.bodyMedium(), MARKER_SIZE, MARKER_TRACKING);
        marker.drawCentered(graphics, SlidePalette.OLIVE, geometry.left(), geometry.top(), geometry.safeWidth());
        FittedText wordmark = TextFitter.line(WORDMARK, fonts.display(), SMALL_WORDMARK, WORDMARK_TRACKING);
        float wordmarkTop = geometry.safeBottom() - wordmark.height();
        wordmark.drawCentered(graphics, SlidePalette.WINE, geometry.left(), wordmarkTop, geometry.safeWidth());

        float regionTop = geometry.top() + marker.height() + GAP;
        float regionBottom = wordmarkTop - GAP;
        float region = regionBottom - regionTop;
        List<Block> blocks = new ArrayList<>();
        blocks.add(text(fit(slide.title(), fonts.display(), TITLE, region * TITLE_SHARE), SlidePalette.WINE));
        blocks.add(gap(GAP));
        if (Objects.nonNull(art.divider())) {
            blocks.add(image(art.divider()));
            blocks.add(gap(GAP));
        }
        blocks.add(text(fit(slide.body(), fonts.body(), BODY, region * BODY_SHARE), SlidePalette.SEPIA));
        stack(graphics, blocks, regionTop, regionBottom);
    }

    void closing(Graphics2D graphics, SlideDeck deck) {
        graphics.drawImage(art.background(), 0, 0, null);
        FittedText legal = fit(deck.legalLine(), fonts.body(), LEGAL, LEGAL_MAX_HEIGHT);
        float legalTop = geometry.safeBottom() - legal.height();
        legal.drawCentered(graphics, SlidePalette.SEPIA, geometry.left(), legalTop, geometry.safeWidth());
        FittedText wordmark = TextFitter.line(WORDMARK, fonts.display(), LARGE_WORDMARK, WORDMARK_TRACKING);
        float wordmarkTop = legalTop - GAP - wordmark.height();
        wordmark.drawCentered(graphics, SlidePalette.WINE, geometry.left(), wordmarkTop, geometry.safeWidth());

        float regionBottom = wordmarkTop - GAP_LARGE;
        List<Block> blocks = new ArrayList<>();
        if (Objects.nonNull(art.sprig())) {
            blocks.add(image(art.sprig()));
            blocks.add(gap(GAP));
        }
        blocks.add(text(fit(deck.cta(), fonts.display(), CTA, (regionBottom - geometry.top()) * CTA_SHARE), SlidePalette.WINE));
        if (Objects.nonNull(art.divider())) {
            blocks.add(gap(GAP));
            blocks.add(image(art.divider()));
        }
        stack(graphics, blocks, geometry.top(), regionBottom);
    }

    private FittedText fit(String text, Font font, TextStyle style, float maxHeight) {
        return TextFitter.fit(text, font, style.maxSize(), style.minSize(), geometry.safeWidth(), maxHeight, style.lineSpacing());
    }

    private void corners(Graphics2D graphics) {
        if (Objects.nonNull(art.cornerLeft())) {
            graphics.drawImage(art.cornerLeft(), CORNER_INSET, CORNER_INSET, null);
        }
        if (Objects.nonNull(art.cornerRight())) {
            graphics.drawImage(art.cornerRight(), geometry.width() - CORNER_INSET - art.cornerRight().getWidth(), CORNER_INSET, null);
        }
    }

    /**
     * Draws the blocks one under the other, centred as a group between {@code top} and {@code bottom}. Every box is
     * budgeted from the same region, so an overflow is a layout defect and fails instead of drawing text over art.
     */
    private static void stack(Graphics2D graphics, List<Block> blocks, float top, float bottom) {
        float total = height(blocks);
        if (total > bottom - top + 1f) {
            throw new SlideRenderer.SlideRenderingException(SlideRenderer.Reason.TEXT_DOES_NOT_FIT,
                    "Slide layout of " + Math.round(total) + "px overflows its " + Math.round(bottom - top) + "px region");
        }
        float cursor = top + Math.max(0f, (bottom - top - total) / 2f);
        for (Block block : blocks) {
            block.painter().paint(graphics, cursor);
            cursor += block.height();
        }
    }

    private Block text(FittedText text, Color color) {
        return new Block(text.height(), (graphics, top) -> text.drawCentered(graphics, color, geometry.left(), top, geometry.safeWidth()));
    }

    private static float height(List<Block> blocks) {
        return (float) blocks.stream().mapToDouble(Block::height).sum();
    }

    private Block image(BufferedImage image) {
        return image(image, image.getHeight());
    }

    /** The image centred horizontally, shrunk (aspect kept) when it is taller than {@code maxHeight}. */
    private Block image(BufferedImage image, float maxHeight) {
        float scale = Math.min(1f, Math.max(0f, maxHeight) / image.getHeight());
        int width = Math.round(image.getWidth() * scale);
        int height = Math.round(image.getHeight() * scale);
        return new Block(height, (graphics, top) -> graphics.drawImage(image, (geometry.width() - width) / 2, Math.round(top),
                width, height, null));
    }

    private static Block gap(float height) {
        return new Block(height, (graphics, top) -> { });
    }

    /** Largest and floor font size of a text role, and its line pitch as a multiple of the font's line height. */
    private record TextStyle(float maxSize, float minSize, float lineSpacing) {
    }

    private record Block(float height, Painter painter) {
    }

    @FunctionalInterface
    private interface Painter {
        void paint(Graphics2D graphics, float top);
    }
}

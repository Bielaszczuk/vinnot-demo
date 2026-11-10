package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.model.RenderedSlide;
import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.model.SlideFormat;

import java.util.List;
import java.util.Objects;

/** Draws a post's carousel as images (#492). */
public interface SlideRenderer {

    /**
     * Renders the cover, one card per copy slide and the closing card, in order, at the exact size of {@code format}.
     *
     * @throws SlideRenderingException when the deck cannot be rendered; its {@link Reason} tells whether a retry helps
     */
    List<RenderedSlide> render(SlideDeck deck, SlideFormat format);

    /** Why a render failed. Only {@link #BUSY} and {@link #INTERRUPTED} are worth retrying with the same deck. */
    enum Reason {
        BUSY(true),
        INTERRUPTED(true),
        TEXT_DOES_NOT_FIT(false),
        INVALID_ILLUSTRATION(false),
        ENCODING_FAILED(false);

        private final boolean retryable;

        Reason(boolean retryable) {
            this.retryable = retryable;
        }

        public boolean retryable() {
            return retryable;
        }
    }

    /** A render that failed for a known {@link Reason}. */
    final class SlideRenderingException extends RuntimeException {
        private final Reason reason;

        public SlideRenderingException(Reason reason, String message) {
            this(reason, message, null);
        }

        public SlideRenderingException(Reason reason, String message, Throwable cause) {
            super(message, cause);
            this.reason = Objects.requireNonNull(reason, "reason");
        }

        public Reason reason() {
            return reason;
        }
    }
}

package com.vinnot.marketing.application.model;

import java.util.Objects;

/**
 * What a network says about a draft it left in the creator's inbox (#516): posted by the creator, with its public link when
 * the network already gives one, or still pending. A pending draft has no link.
 */
public record DraftCheck(State state, String permalink) {

    public enum State { POSTED, PENDING }

    public DraftCheck {
        Objects.requireNonNull(state, "state");
        if (state == State.PENDING && Objects.nonNull(permalink)) {
            throw new IllegalArgumentException("A pending draft has no public link");
        }
    }

    /** The creator posted the draft; the link may still be unknown. */
    public static DraftCheck posted(String permalink) {
        return new DraftCheck(State.POSTED, permalink);
    }

    /** The draft is still waiting in the inbox, or the network is still processing it. */
    public static DraftCheck pending() {
        return new DraftCheck(State.PENDING, null);
    }
}

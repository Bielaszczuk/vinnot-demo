package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.PostLanguage;

import java.util.List;

/**
 * The copy of one language an administrator typed (#497: the other language stays as it is); validated by the domain with
 * the same limits as generated copy.
 */
public record EditSocialPostCommand(PostLanguage language, String hook, List<Slide> slides, String caption, List<String> hashtags,
        String altText, String cta) {
    public record Slide(String title, String body) { }
}

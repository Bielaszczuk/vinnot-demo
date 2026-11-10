package com.vinnot.marketing.infrastructure.web.dto;

import com.vinnot.marketing.application.model.EditSocialPostCommand;
import com.vinnot.marketing.domain.model.PostLanguage;

import java.util.List;
import java.util.Objects;

/**
 * Body of {@code PUT /admin/social-posts/{id}}: the edited copy of one language ({@code "es"} or {@code "en"}, #497); a
 * missing or other language is a 400, and the domain validates the copy's limits.
 */
public record EditSocialPostRequest(String language, String hook, List<Slide> slides, String caption, List<String> hashtags,
        String altText, String cta) {

    public record Slide(String title, String body) { }

    public EditSocialPostCommand toCommand() {
        return new EditSocialPostCommand(PostLanguage.fromCode(language), hook, Objects.isNull(slides) ? null
                : slides.stream().map(slide -> new EditSocialPostCommand.Slide(slide.title(), slide.body())).toList(),
                caption, hashtags, altText, cta);
    }
}

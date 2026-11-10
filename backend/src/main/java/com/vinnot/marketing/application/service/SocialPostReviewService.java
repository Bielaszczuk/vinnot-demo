package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.EditSocialPostCommand;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import com.vinnot.marketing.application.port.in.ReviewSocialPostUseCase;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * The approval queue actions (#489); the post decides which transitions are allowed. An edit replaces one language's copy
 * (#497). New copy or a new illustration queue a render of the post's images (#492). Each action writes only over the status
 * it read (#510), so an approved post that started publishing meanwhile is never rejected or edited back to the queue: the
 * action conflicts instead.
 */
@Service
@RequiredArgsConstructor
public class SocialPostReviewService implements ReviewSocialPostUseCase {
    private final SocialPostRepository posts;
    private final GenerateSocialCopyUseCase copy;
    private final SocialPostPresenter presenter;
    private final SocialMediaRenderQueue renders;

    @Override
    public SocialPostAdminResponse approve(UUID postId, UUID reviewer, Instant now) {
        SocialPost post = load(postId);
        SocialPostStatus read = post.status();
        post.approve(reviewer, now);
        saveOver(post, read);
        return presenter.present(post);
    }

    @Override
    public SocialPostAdminResponse reject(UUID postId, UUID reviewer, String reason, Instant now) {
        SocialPost post = load(postId);
        SocialPostStatus read = post.status();
        post.reject(reviewer, reason, now);
        saveOver(post, read);
        return presenter.present(post);
    }

    @Override
    public SocialPostAdminResponse edit(UUID postId, EditSocialPostCommand command, UUID editor, Instant now) {
        SocialPost post = load(postId);
        SocialPostStatus read = post.status();
        List<PostCopy.Slide> slides = Objects.isNull(command.slides()) ? null
                : command.slides().stream().map(slide -> new PostCopy.Slide(slide.title(), slide.body())).toList();
        post.edit(command.language(), PostCopy.of(command.language(), command.hook(), slides, command.caption(), command.hashtags(),
                command.altText(), command.cta()), editor, now);
        saveOver(post, read);
        renders.requestFor(post);
        return presenter.present(post);
    }

    @Override
    public SocialPostAdminResponse newIllustration(UUID postId, Instant now) {
        SocialPost post = load(postId);
        SocialPostStatus read = post.status();
        post.requestNewIllustration(now);
        saveOver(post, read);
        renders.requestFor(post);
        return presenter.present(post);
    }

    @Override
    public SocialPostAdminResponse regenerate(UUID postId, Instant now) {
        load(postId).requireRegenerable();
        return presenter.present(copy.generate(postId, now));
    }

    /** Saves the post only over the status it was read in; a concurrent change (publishing started) is a conflict. */
    private void saveOver(SocialPost post, SocialPostStatus read) {
        if (!posts.saveIfStatus(post, read)) {
            throw new InvalidPostTransitionException(read, "save a change read from");
        }
    }

    private SocialPost load(UUID postId) {
        return posts.findById(postId).orElseThrow(() -> new EntityNotFoundException("SocialPost", postId));
    }
}

package com.vinnot.user.infrastructure.community;

import com.vinnot.community.application.port.in.GetSocialUseCase;
import com.vinnot.community.application.query.response.SocialProfileSummary;
import com.vinnot.community.application.query.response.SocialProfileSummary.TasteTraitsView;
import com.vinnot.user.application.port.out.SocialProfilePort;
import com.vinnot.user.application.port.out.SocialProfilePort.FamilyShare;
import com.vinnot.user.application.port.out.SocialProfilePort.TasteTraits;
import com.vinnot.user.application.port.out.SocialProfilePort.TraitScore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Reads the social part of a profile from the community module, which owns follows, blocks and taste. */
@Component
@RequiredArgsConstructor
public class CommunitySocialProfileAdapter implements SocialProfilePort {
    private final GetSocialUseCase social;

    @Override
    public SocialProfile profile(UUID viewer, UUID userId) {
        SocialProfileSummary summary = social.profile(viewer, userId);
        List<TasteSlice> wheel = Objects.isNull(summary.tasteWheel()) ? null : summary.tasteWheel().stream()
                .map(slice -> new TasteSlice(slice.kind(), slice.value(), slice.label(), slice.score(), slice.tone(),
                        slice.ratedWines())).toList();
        return new SocialProfile(summary.tier(), summary.followersCount(), summary.followingCount(),
                summary.reviewsCount(), summary.cellarCount(), summary.cellarVisible(), summary.following(),
                summary.followsYou(), summary.affinityPercent(), wheel, traits(summary.tasteTraits()));
    }

    private static TasteTraits traits(TasteTraitsView traits) {
        if (Objects.isNull(traits)) {
            return null;
        }
        return new TasteTraits(
                traits.structure().stream()
                        .map(score -> new TraitScore(score.trait(), score.score(), score.wines(), score.adjusted()))
                        .toList(),
                traits.families().stream().map(share -> new FamilyShare(share.family(), share.percent())).toList(),
                traits.fromQuiz());
    }
}

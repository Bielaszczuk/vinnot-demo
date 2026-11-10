package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.DraftCheck;
import com.vinnot.marketing.application.port.in.SyncSocialDraftsUseCase;
import com.vinnot.marketing.application.port.out.SocialDraftTracker;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * The draft sweep (#516 S1). A TikTok post sent in {@code MEDIA_UPLOAD} mode waits as a draft in the creator's inbox
 * ({@code DRAFT_SENT}); once the creator posts it from the app, the network's tracker says so and the publication becomes
 * {@code PUBLISHED}, with its public link when known, written only over the draft status so a concurrent sweep never
 * writes it twice. Only drafts sent in the last {@code app.marketing.publishing.draft-sync.window-days} (14) are checked,
 * oldest first and at most {@code max-per-sweep} (20) per run, which keeps a run well inside TikTok's 30 status requests
 * per minute; older drafts are left as they are. A network without a tracker is skipped. A draft that fails is logged and
 * the others go on, except a failure of the whole network (not connected, invalid token, rate limited), which stops that
 * network's checks until the next run. The post itself was already settled when the draft was sent (a draft counts).
 */
@Service
public class SyncSocialDraftsService implements SyncSocialDraftsUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(SyncSocialDraftsService.class);
    private static final Set<SocialPublishingException.Code> NETWORK_WIDE = EnumSet.of(SocialPublishingException.Code.NOT_CONNECTED,
            SocialPublishingException.Code.TOKEN_INVALID, SocialPublishingException.Code.RATE_LIMITED);
    private final SocialPublicationRepository publications;
    private final Map<SocialNetwork, SocialDraftTracker> trackers = new EnumMap<>(SocialNetwork.class);
    private final Duration window;
    private final int maxPerSweep;

    @Autowired
    public SyncSocialDraftsService(SocialPublicationRepository publications, ObjectProvider<SocialDraftTracker> trackers,
            @Value("${app.marketing.publishing.draft-sync.window-days:14}") int windowDays,
            @Value("${app.marketing.publishing.draft-sync.max-per-sweep:20}") int maxPerSweep) {
        this(publications, trackers.orderedStream().toList(), windowDays, maxPerSweep);
    }

    SyncSocialDraftsService(SocialPublicationRepository publications, List<SocialDraftTracker> trackers, int windowDays, int maxPerSweep) {
        if (windowDays < 1) {
            throw new IllegalArgumentException("app.marketing.publishing.draft-sync.window-days must be at least 1, got " + windowDays);
        }
        if (maxPerSweep < 1) {
            throw new IllegalArgumentException("app.marketing.publishing.draft-sync.max-per-sweep must be at least 1, got " + maxPerSweep);
        }
        this.publications = publications;
        for (SocialDraftTracker tracker : trackers) {
            this.trackers.put(tracker.network(), tracker);
        }
        this.window = Duration.ofDays(windowDays);
        this.maxPerSweep = maxPerSweep;
    }

    @Override
    public int syncDrafts(Instant now) {
        if (trackers.isEmpty()) {
            return 0;
        }
        Set<SocialNetwork> stopped = EnumSet.noneOf(SocialNetwork.class);
        int posted = 0;
        for (SocialPublication draft : publications.findDraftsSentSince(now.minus(window), maxPerSweep)) {
            SocialDraftTracker tracker = trackers.get(draft.network());
            if (Objects.nonNull(tracker) && !stopped.contains(draft.network()) && sync(tracker, draft, now, stopped)) {
                posted++;
            }
        }
        return posted;
    }

    private boolean sync(SocialDraftTracker tracker, SocialPublication draft, Instant now, Set<SocialNetwork> stopped) {
        try {
            DraftCheck check = tracker.check(draft.externalId());
            if (check.state() != DraftCheck.State.POSTED) {
                return false;
            }
            draft.draftPosted(check.permalink(), now);
            boolean saved = publications.saveIfStatus(draft, PublicationStatus.DRAFT_SENT);
            if (saved) {
                LOGGER.info("The {} draft of social publication {} was posted by the creator", draft.network(), draft.id());
            }
            return saved;
        } catch (SocialPublishingException failure) {
            LOGGER.warn("Could not check the {} draft of social publication {}: {} {}", draft.network(), draft.id(), failure.code(),
                    failure.detail());
            if (NETWORK_WIDE.contains(failure.code())) {
                stopped.add(draft.network());
            }
            return false;
        } catch (RuntimeException failure) {
            LOGGER.warn("Could not check the {} draft of social publication {}: {}", draft.network(), draft.id(),
                    failure.getMessage());
            return false;
        }
    }
}

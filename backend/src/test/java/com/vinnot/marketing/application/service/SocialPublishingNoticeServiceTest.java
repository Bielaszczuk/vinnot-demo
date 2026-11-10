package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.AdminRecipients;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #510 S3/S5: every administrator hears about a failed post, a TikTok draft and an account to reconnect, once each. */
class SocialPublishingNoticeServiceTest {
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final AdminRecipients admins = mock(AdminRecipients.class);
    private final SocialPublishingNoticeService service = new SocialPublishingNoticeService(notifications, admins);
    private final UUID ana = UUID.randomUUID();
    private final UUID leo = UUID.randomUUID();

    @BeforeEach
    void twoAdmins() {
        when(admins.admins()).thenReturn(List.of(ana, leo));
    }

    @Test
    void aFailedPostNamesTheNetworkAndTheErrorPerPublishingRun() {
        SocialPost post = PublishingFixtures.scheduled();
        post.publishingFailed("TOKEN_INVALID", NOW.plusSeconds(90));

        service.postFailed(post, SocialNetwork.INSTAGRAM, "TOKEN_INVALID");

        List<NotificationRequest> sent = sent(2);
        NotificationRequest first = sent.getFirst();
        assertThat(first.type()).isEqualTo(NotificationType.SOCIAL_POST_FAILED);
        assertThat(first.recipient().userId()).isEqualTo(ana);
        assertThat(first.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(first.data()).isEqualTo(Map.of("postId", post.id().toString(), "network", "INSTAGRAM", "error", "TOKEN_INVALID"));
        assertThat(first.dedupeKey()).isEqualTo("social-failed:" + post.id() + ":INSTAGRAM:" + NOW.plusSeconds(90).toEpochMilli() + ":" + ana);
        assertThat(sent.get(1).recipient().userId()).isEqualTo(leo);
    }

    @Test
    void aPostWhoseMediaNeverGotReadyFailsWithoutANetwork() {
        SocialPost post = PublishingFixtures.approved(false);
        post.publishingFailed("MEDIA_NOT_READY", NOW.plusSeconds(30));

        service.postFailed(post, null, "MEDIA_NOT_READY");

        NotificationRequest first = sent(2).getFirst();
        assertThat(first.data()).isEqualTo(Map.of("postId", post.id().toString(), "error", "MEDIA_NOT_READY"));
        assertThat(first.dedupeKey()).isEqualTo("social-failed:" + post.id() + ":ALL:" + NOW.plusSeconds(30).toEpochMilli() + ":" + ana);
    }

    @Test
    void aFailedPostWithoutPublishingRecordStillGetsAKey() {
        SocialPost post = PublishingFixtures.approved(true);

        service.postFailed(post, SocialNetwork.FACEBOOK, "REJECTED");

        assertThat(sent(2).getFirst().dedupeKey()).isEqualTo("social-failed:" + post.id() + ":FACEBOOK:0:" + ana);
    }

    @Test
    void aTiktokDraftIsAnnouncedOncePerPost() {
        SocialPost post = PublishingFixtures.scheduled();

        service.tiktokDraftWaiting(post);

        NotificationRequest first = sent(2).getFirst();
        assertThat(first.type()).isEqualTo(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING);
        assertThat(first.data()).isEqualTo(Map.of("postId", post.id().toString()));
        assertThat(first.dedupeKey()).isEqualTo("social-tiktok-draft:" + post.id() + ":" + ana);
    }

    @Test
    void anAccountToReconnectIsAnnouncedOncePerNetworkAndDay() {
        service.accountNeedsReconnect(SocialNetwork.THREADS);

        NotificationRequest first = sent(2).getFirst();
        assertThat(first.type()).isEqualTo(NotificationType.SOCIAL_ACCOUNT_RECONNECT);
        assertThat(first.data()).isEqualTo(Map.of("network", "THREADS"));
        assertThat(first.dedupeKey()).startsWith("social-reconnect:THREADS:").endsWith(":" + ana)
                .contains(LocalDate.now(ZoneOffset.UTC).toString().substring(0, 4));
    }

    private List<NotificationRequest> sent(int count) {
        ArgumentCaptor<NotificationRequest> requests = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(count)).enqueue(requests.capture());
        return requests.getAllValues();
    }
}

package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.SocialPost;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.SATURDAY_SLOT;
import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** S3 and S6: the queued job writes the copy of a planned batch and tells the admins how many posts wait for them. */
class PlannedCopyServiceTest {
    private static final LocalDate FROM = LocalDate.of(2026, 11, 2);
    private static final LocalDate TO = LocalDate.of(2026, 11, 15);
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final GenerateSocialCopyUseCase copy = mock(GenerateSocialCopyUseCase.class);
    private final SocialBatchNoticeService notice = mock(SocialBatchNoticeService.class);
    private final PlannedCopyService service = new PlannedCopyService(posts, copy, notice);

    @Test
    void writesEveryDraftAndCountsOnlyTheOnesNowPendingInTheNotice() {
        SocialPost written = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost failed = MarketingFixtures.draft(SATURDAY_SLOT, "WINE_DAY", "MERLOT");
        when(posts.findById(written.id())).thenReturn(Optional.of(written));
        when(posts.findById(failed.id())).thenReturn(Optional.of(failed));
        when(copy.generate(written.id(), NOW)).thenReturn(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(copy.generate(failed.id(), NOW)).thenReturn(failed);

        assertThat(service.execute(new PlannedBatch(List.of(written.id(), failed.id()), FROM, TO), NOW)).isEqualTo(1);

        verify(copy).generate(written.id(), NOW);
        verify(copy).generate(failed.id(), NOW);
        verify(notice).send(1, FROM, TO);
    }

    @Test
    void aRetriedBatchKeepsTheCopyAlreadyWrittenAndSkipsPostsThatAreGone() {
        SocialPost alreadyWritten = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        UUID deleted = UUID.randomUUID();
        when(posts.findById(alreadyWritten.id())).thenReturn(Optional.of(alreadyWritten));
        when(posts.findById(deleted)).thenReturn(Optional.empty());

        assertThat(service.execute(new PlannedBatch(List.of(alreadyWritten.id(), deleted), FROM, TO), NOW)).isEqualTo(1);

        verify(copy, never()).generate(any(), any());
        verify(notice).send(1, FROM, TO);
    }

    @Test
    void aPostThatCannotBeWrittenDoesNotStopTheRestOfTheBatch() {
        SocialPost broken = MarketingFixtures.draft(TUESDAY_SLOT, "UNKNOWN_PILLAR", null);
        SocialPost written = MarketingFixtures.draft(SATURDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(broken.id())).thenReturn(Optional.of(broken));
        when(posts.findById(written.id())).thenReturn(Optional.of(written));
        when(copy.generate(broken.id(), NOW)).thenThrow(new IllegalStateException("Unknown content pillar UNKNOWN_PILLAR"));
        when(copy.generate(written.id(), NOW)).thenReturn(MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null));

        assertThat(service.execute(new PlannedBatch(List.of(broken.id(), written.id()), FROM, TO), NOW)).isEqualTo(1);

        verify(notice).send(1, FROM, TO);
    }
}

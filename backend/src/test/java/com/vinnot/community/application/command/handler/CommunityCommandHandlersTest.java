package com.vinnot.community.application.command.handler;
import com.vinnot.community.application.command.model.*;
import com.vinnot.community.application.port.out.*;
import com.vinnot.community.domain.model.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import com.vinnot.community.application.port.out.ReportOutcomeNotifier;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.anyBoolean;
class CommunityCommandHandlersTest {
    final UUID reporter=UUID.randomUUID(), author=UUID.randomUUID(), moderator=UUID.randomUUID();
    final ContentTarget target=new ContentTarget(ContentTarget.Type.REVIEW,UUID.randomUUID());
    final Instant now=Instant.parse("2026-09-30T00:00:00Z");
    final Clock clock=Clock.fixed(now,ZoneOffset.UTC);
    final CommunityReportRepositoryPort reports=mock(CommunityReportRepositoryPort.class);
    final CommunityTargetPort targets=mock(CommunityTargetPort.class);
    final CreateReportCommand command=new CreateReportCommand(reporter,target,CommunityReport.Reason.SPAM,"details");
    CommunityReport report() { return CommunityReport.create(reporter,target,author,CommunityReport.Reason.SPAM,"details","excerpt",now); }
    @Test void createsWithServerAuthorAndDeduplicatesBeforeRateLimitOrDeletedTarget() {
        var handler=new CreateReportCommandHandler(reports,targets,clock);
        when(targets.findPublic(target)).thenReturn(Optional.of(new CommunityTargetPort.TargetDetails(author,"excerpt")));
        when(reports.save(any())).thenAnswer(call->call.getArgument(0));
        var receipt=handler.execute(command);
        assertThat(receipt.status()).isEqualTo(CommunityReport.Status.OPEN);
        verify(reports).lockReporter(reporter);
        verify(reports).countSince(reporter,now.minus(Duration.ofDays(1)));
        when(reports.findOpen(reporter,target)).thenReturn(Optional.of(report()));
        reset(targets);
        assertThat(handler.execute(command).target()).isEqualTo(target);
        verifyNoInteractions(targets);
        new CreateReportCommandHandler(reports,targets).execute(command);
    }
    @Test void rejectsQuotaAndUnavailableTarget() {
        var handler=new CreateReportCommandHandler(reports,targets,clock);
        when(reports.countSince(eq(reporter),any())).thenReturn(10L);
        assertThatThrownBy(()->handler.execute(command)).hasMessageContaining("Daily");
        verifyNoInteractions(targets);
        when(reports.countSince(eq(reporter),any())).thenReturn(0L);
        assertThatThrownBy(()->handler.execute(command)).hasMessageContaining("Content");
        verify(reports,never()).save(any());
    }
    @Test void reviewsUnderLockAndRejectsUnknownReport() {
        var outcomes=mock(ReportOutcomeNotifier.class);
        var handler=new ReviewReportCommandHandler(reports,outcomes,clock);var report=report();
        var review=new ReviewReportCommand(report.id(),moderator,CommunityReport.Status.IN_REVIEW,"");
        assertThatThrownBy(()->handler.execute(review)).hasMessageContaining("Report");
        when(reports.findForUpdate(report.id())).thenReturn(Optional.of(report));
        when(reports.save(any())).thenAnswer(call->call.getArgument(0));
        assertThat(handler.execute(review).reviewerId()).isEqualTo(moderator);
        assertThat(new ReviewReportCommandHandler(reports,outcomes).execute(review).status()).isEqualTo(CommunityReport.Status.IN_REVIEW);
        verify(outcomes,never()).reportClosed(any(),anyBoolean());
        var dismissed=handler.execute(new ReviewReportCommand(report.id(),moderator,CommunityReport.Status.DISMISSED,"No breach"));
        verify(outcomes).reportClosed(dismissed,false);
    }
    @Test void blocksAreIdempotentAndUnblockDoesNotRequireTargetToStillExist() {
        var blocks=mock(UserBlockRepositoryPort.class);var handler=new ChangeUserBlockCommandHandler(blocks,mock(FollowRepositoryPort.class),mock(FollowerPointsPort.class));
        assertThatThrownBy(()->handler.execute(new ChangeUserBlockCommand(reporter,reporter,true))).hasMessageContaining("yourself");
        assertThatThrownBy(()->handler.execute(new ChangeUserBlockCommand(reporter,author,true))).hasMessageContaining("User");
        when(blocks.userExists(author)).thenReturn(true);
        handler.execute(new ChangeUserBlockCommand(reporter,author,true));verify(blocks).block(reporter,author);
        handler.execute(new ChangeUserBlockCommand(reporter,author,false));verify(blocks).unblock(reporter,author);
    }
}

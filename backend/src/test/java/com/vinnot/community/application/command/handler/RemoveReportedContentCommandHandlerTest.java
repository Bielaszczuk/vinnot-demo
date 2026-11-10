package com.vinnot.community.application.command.handler;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;

import com.vinnot.community.application.command.model.ReviewReportCommand;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.ReportedContentRemovalPort;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import com.vinnot.community.application.port.out.ReportOutcomeNotifier;
import java.util.Optional;
import java.util.UUID;

class RemoveReportedContentCommandHandlerTest {
    @Test
    void validatesBeforeRemovalAndPropagatesFailureBeforeResolution() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var removal = mock(ReportedContentRemovalPort.class);
        var notifier = mock(ReportOutcomeNotifier.class);
        var handler = new RemoveReportedContentCommandHandler(reports, removal, notifier);
        UUID reporter = UUID.randomUUID(),
                author = UUID.randomUUID(),
                moderator = UUID.randomUUID();
        var report =
                CommunityReport.create(
                        reporter,
                        new ContentTarget(ContentTarget.Type.REVIEW, UUID.randomUUID()),
                        author,
                        CommunityReport.Reason.SPAM,
                        "",
                        "evidence",
                        Instant.now());
        var command =
                new ReviewReportCommand(
                        report.id(), moderator, CommunityReport.Status.RESOLVED, "Removed");
        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(EntityNotFoundException.class);
        when(reports.findForUpdate(report.id())).thenReturn(Optional.of(report));
        assertThatThrownBy(
                        () ->
                                handler.execute(
                                        new ReviewReportCommand(
                                                report.id(),
                                                author,
                                                CommunityReport.Status.RESOLVED,
                                                "Removed")))
                .isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(removal);
        doThrow(new EntityNotFoundException("Review", report.target().id()))
                .when(removal)
                .remove(report.target(), moderator, "SPAM");
        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(EntityNotFoundException.class);
        verify(reports, never()).save(any());
        doNothing().when(removal).remove(report.target(), moderator, "SPAM");
        when(reports.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        assertThat(handler.execute(command).status()).isEqualTo(CommunityReport.Status.RESOLVED);
        verify(notifier).reportClosed(argThat(closed -> closed.status() == CommunityReport.Status.RESOLVED),
                eq(true));
        var userReport =
                CommunityReport.create(
                        reporter,
                        new ContentTarget(ContentTarget.Type.USER, author),
                        author,
                        CommunityReport.Reason.SPAM,
                        "",
                        "",
                        Instant.now());
        when(reports.findForUpdate(userReport.id())).thenReturn(Optional.of(userReport));
        assertThatThrownBy(
                        () ->
                                handler.execute(
                                        new ReviewReportCommand(
                                                userReport.id(),
                                                moderator,
                                                CommunityReport.Status.RESOLVED,
                                                "Remove")))
                .isInstanceOf(BusinessRuleViolationException.class);
    }
}

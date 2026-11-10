package com.vinnot.community.domain.model;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
class CommunityReportTest {
    final UUID reporter=UUID.randomUUID(), author=UUID.randomUUID(), moderator=UUID.randomUUID();
    final ContentTarget target=new ContentTarget(ContentTarget.Type.REVIEW,UUID.randomUUID());
    final Instant now=Instant.parse("2026-09-30T00:00:00Z");
    CommunityReport report() { return CommunityReport.create(reporter,target,author,CommunityReport.Reason.SPAM," details ","excerpt",now); }
    @Test void validatesOwnershipBoundedTextAndOtherReason() {
        assertThat(report().description()).isEqualTo("details");
        assertThatThrownBy(()->CommunityReport.create(author,target,author,CommunityReport.Reason.SPAM,"","",now)).hasMessageContaining("own content");
        assertThatThrownBy(()->CommunityReport.create(reporter,target,author,CommunityReport.Reason.OTHER," ","",now)).hasMessageContaining("2000");
        assertThatThrownBy(()->CommunityReport.create(reporter,target,author,CommunityReport.Reason.SPAM,"x".repeat(2001),"",now)).hasMessageContaining("2000");
        assertThat(CommunityReport.create(reporter,target,null,CommunityReport.Reason.SPAM,null,"x".repeat(2100),now).excerpt()).hasSize(2000);
        assertThat(CommunityReport.create(reporter,target,author,CommunityReport.Reason.OTHER,"details",null,now).excerpt()).isEmpty();
    }
    @Test void preventsSelfModerationReassignmentAndChangingFinalDecision() {
        assertThatThrownBy(()->report().review(reporter,CommunityReport.Status.IN_REVIEW,null,now)).hasMessageContaining("Another moderator");
        assertThatThrownBy(()->report().review(author,CommunityReport.Status.IN_REVIEW,null,now)).hasMessageContaining("Another moderator");
        assertThatThrownBy(()->report().review(moderator,CommunityReport.Status.OPEN,null,now)).hasMessageContaining("transition");
        var assigned=report().review(moderator,CommunityReport.Status.IN_REVIEW,null,now);
        assertThat(assigned.reviewerId()).isEqualTo(moderator);
        assertThatThrownBy(()->assigned.review(UUID.randomUUID(),CommunityReport.Status.RESOLVED,"removed",now)).hasMessageContaining("assigned");
        assertThatThrownBy(()->assigned.review(moderator,CommunityReport.Status.RESOLVED," ",now)).hasMessageContaining("decision");
        assertThatThrownBy(()->assigned.review(moderator,CommunityReport.Status.IN_REVIEW,"x".repeat(2001),now)).hasMessageContaining("decision");
        for (var status : new CommunityReport.Status[]{CommunityReport.Status.RESOLVED,CommunityReport.Status.DISMISSED}) {
            var closed=assigned.review(moderator,status," Reviewed ",now.plusSeconds(1));
            assertThat(closed.decision()).isEqualTo("Reviewed");
            assertThatThrownBy(()->closed.review(moderator,CommunityReport.Status.IN_REVIEW,"retry",now)).hasMessageContaining("transition");
        }
    }
}

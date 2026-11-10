package com.vinnot.support.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class SupportRequestTest {
    private final UUID id = UUID.randomUUID();
    @Test void normalizesAndBoundsEveryField() {
        var value = new SupportRequest(id, "  Name ", " contact@example.org ", "privacy", " Message\nnext line ");
        assertThat(value.name()).isEqualTo("Name");
        assertThat(value.email()).isEqualTo("contact@example.org");
        assertThat(value.message()).isEqualTo("Message\nnext line");
        for (String subject : new String[]{"general", "support", "privacy", "report", "appeal", "partnership", "feedback", "other"}) {
            assertThat(new SupportRequest(id, "n".repeat(100), "a@example.org", subject, "m".repeat(4000)).subject()).isEqualTo(subject);
        }
    }
    @Test void keepsEnglishAndFallsBackToSpanishForTheAcknowledgement() {
        assertThat(new SupportRequest(id, "Name", "a@b.org", "support", "Text", "en").language()).isEqualTo("en");
        assertThat(new SupportRequest(id, "Name", "a@b.org", "support", "Text", "pt").language()).isEqualTo("es");
        assertThat(new SupportRequest(id, "Name", "a@b.org", "support", "Text").language()).isEqualTo("es");
    }
    @Test void rejectsInvalidFieldsAndHeaderInjection() {
        assertThatThrownBy(() -> new SupportRequest(null, "Name", "a@b.org", "support", "Text")).isInstanceOf(DomainException.class);
        // A name-based id could collide with the server's per-address acknowledgement marker.
        assertThatThrownBy(() -> new SupportRequest(UUID.nameUUIDFromBytes(new byte[]{1}), "Name", "a@b.org", "support", "Text"))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "INVALID_SUPPORT_REQUEST");
        for (String name : new String[]{null, "", " ", "x".repeat(101), "N\nBcc: x", "N\rBcc:x", "N\u0000"}) {
            assertThatThrownBy(() -> new SupportRequest(id, name, "a@b.org", "support", "Text")).isInstanceOf(DomainException.class);
        }
        for (String email : new String[]{null, "", "invalid", "a@b.org\nX", "a".repeat(255)}) {
            assertThatThrownBy(() -> new SupportRequest(id, "Name", email, "support", "Text")).isInstanceOf(DomainException.class);
        }
        for (String subject : new String[]{null, "", "arbitrary"}) {
            assertThatThrownBy(() -> new SupportRequest(id, "Name", "a@b.org", subject, "Text")).isInstanceOf(DomainException.class);
        }
        for (String message : new String[]{null, "", "  ", "x".repeat(4001), "x\u0000"}) {
            assertThatThrownBy(() -> new SupportRequest(id, "Name", "a@b.org", "support", message)).isInstanceOf(DomainException.class);
        }
    }
}

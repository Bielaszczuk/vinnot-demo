package com.vinnot.user.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.domain.valueobject.CellarVisibility;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #541 S7: the public bio (trimmed, at most 160 characters, blank clears it) and the cellar visibility setting. */
class UserSocialProfileTest {

    @Test
    void aNewMemberHasNoBioAndAPublicCellar() {
        User user = member();
        assertThat(user.getBio()).isNull();
        assertThat(user.getCellarVisibility()).isEqualTo(CellarVisibility.PUBLIC);
    }

    @Test
    void theBioIsTrimmedAndABlankBioClearsIt() {
        User user = member();
        user.updateBio("  Malbec lover from Mendoza.  ");
        assertThat(user.getBio()).isEqualTo("Malbec lover from Mendoza.");
        user.updateBio("   ");
        assertThat(user.getBio()).isNull();
    }

    @Test
    void theBioAcceptsExactly160CharactersCountingEmojiAsOneAndRejectsMore() {
        User user = member();
        String exact = "🍷" + "a".repeat(159);
        user.updateBio(exact);
        assertThat(user.getBio()).isEqualTo(exact);
        assertThatThrownBy(() -> user.updateBio("a".repeat(161)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("BIO_TOO_LONG");
        assertThat(user.getBio()).isEqualTo(exact);
    }

    @Test
    void theCellarVisibilityParsesTheThreeValuesAndRejectsAnythingElse() {
        User user = member();
        user.changeCellarVisibility(CellarVisibility.of("followers"));
        assertThat(user.getCellarVisibility()).isEqualTo(CellarVisibility.FOLLOWERS);
        user.changeCellarVisibility(CellarVisibility.of("PRIVATE"));
        assertThat(user.getCellarVisibility()).isEqualTo(CellarVisibility.PRIVATE);
        assertThatThrownBy(() -> CellarVisibility.of("FRIENDS"))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_CELLAR_VISIBILITY");
    }

    @Test
    void theBuilderRestoresStoredValuesAndDefaultsAMissingVisibilityToPublic() {
        User restored = User.builder().id(UUID.randomUUID()).email(Email.of("a@vinnot.com"))
                .password(Password.fromHash("hash")).bio("Sommelier").cellarVisibility(null).build();
        assertThat(restored.getBio()).isEqualTo("Sommelier");
        assertThat(restored.getCellarVisibility()).isEqualTo(CellarVisibility.PUBLIC);
    }

    private User member() {
        return User.create("ana-vinnoter", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Lopez");
    }
}

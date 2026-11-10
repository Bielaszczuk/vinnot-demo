package com.vinnot.user.infrastructure.gamification;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointRules;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** S2: a complete profile is a photo, a first and last name and a phone, awarded once under one key. */
class GamificationProfilePointsAdapterTest {
    private final AwardPointsUseCase points = mock(AwardPointsUseCase.class);
    private final GamificationProfilePointsAdapter adapter = new GamificationProfilePointsAdapter(points);

    @Test
    void aPhotoAndBothNamesWithoutAPhoneEarnNothing() {
        User user = member();

        adapter.profileChanged(user);

        verifyNoInteractions(points);
    }

    @Test
    void addingThePhoneCompletesTheProfileUnderItsSingleKey() {
        User user = member();
        user.updatePhoneNumber("+5491123456789");

        adapter.profileChanged(user);

        verify(points).award(new AwardPointsCommand(user.getId(), PointSource.PROFILE_COMPLETE,
                PointRules.PROFILE_KEY, null));
    }

    private User member() {
        User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Gómez");
        user.updateProfileImage("https://cdn.example.org/a.jpg");
        return user;
    }
}

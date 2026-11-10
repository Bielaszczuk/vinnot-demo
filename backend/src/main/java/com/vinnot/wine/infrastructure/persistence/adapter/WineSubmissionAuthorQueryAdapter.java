package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WineSubmissionAuthorQueryAdapter implements WineSubmissionAuthorQueryPort {
    private final UserRepositoryPort users;

    @Override
    public List<Author> findAllByIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return users.findUsernamesByIds(ids).entrySet().stream()
                .map(user -> new Author(user.getKey(), user.getValue())).toList();
    }
}

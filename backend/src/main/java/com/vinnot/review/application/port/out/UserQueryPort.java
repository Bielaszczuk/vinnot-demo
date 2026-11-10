package com.vinnot.review.application.port.out;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

public interface UserQueryPort {

    /**
     * Finds user data by ID.
     *
     * @param userId the user ID
     * @return the user data if found
     */
    Optional<UserData> findById(UUID userId);

    /**
     * Finds multiple users by their IDs (batch lookup).
     *
     * @param ids the user IDs
     * @return list of user data
     */
    List<UserData> findAllByIds(Collection<UUID> ids);

    record UserData(
            UUID id,
            String username,
            String firstName,
            String lastName,
            String profileImageUrl
    ) {
        /** The name other users see: first and last name when given, otherwise the username. */
        public String publicName() {
            String name = Stream.of(firstName, lastName)
                    .filter(part -> Objects.nonNull(part) && !part.isBlank())
                    .reduce((first, last) -> first + " " + last)
                    .orElse("");
            return name.isBlank() ? username : name;
        }
    }
}

package com.vinnot.sharing.application.query;

import com.vinnot.sharing.application.port.in.GetSharedContentUseCase;
import com.vinnot.sharing.application.port.out.SharedContentQueryPort;
import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetSharedContentQueryHandler implements GetSharedContentUseCase {
    private final SharedContentQueryPort content;
    @Override
    @Transactional(readOnly = true)
    public Optional<SharedContent> execute(SharedContentKind kind, UUID id, boolean english) {
        return content.findPublic(kind, id, english);
    }
}

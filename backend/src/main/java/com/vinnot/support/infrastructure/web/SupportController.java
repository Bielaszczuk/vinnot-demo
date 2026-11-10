package com.vinnot.support.infrastructure.web;

import com.vinnot.support.application.port.in.SubmitSupportRequestUseCase;
import com.vinnot.support.domain.model.SupportRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.UUID;

@RestController
@RequestMapping("/support/requests")
public class SupportController {
    private final SubmitSupportRequestUseCase submit;
    public SupportController(SubmitSupportRequestUseCase submit) { this.submit = submit; }
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Receipt accept(@Valid @RequestBody Request request) {
        return new Receipt(submit.submit(new SupportRequest(request.requestId(), request.name(),
                request.email(), request.subject(), request.message(), request.language())));
    }
    public record Request(@NotNull UUID requestId, @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 30) String subject, @NotBlank @Size(max = 4000) String message,
            @Size(max = 5) String language) { }
    public record Receipt(UUID requestId) { }
}

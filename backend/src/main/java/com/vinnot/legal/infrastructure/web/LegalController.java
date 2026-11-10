package com.vinnot.legal.infrastructure.web;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.legal.domain.model.TermsStatus;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/legal")
public class LegalController {
    private final LegalAgreementUseCase agreements;
    public LegalController(LegalAgreementUseCase agreements) { this.agreements = agreements; }
    @GetMapping("/terms/current")
    public TermsDocument current(@RequestParam(defaultValue = "es") String locale) { return agreements.current(locale); }
    @GetMapping("/terms/versions/{version}")
    public TermsDocument version(@PathVariable String version, @RequestParam(defaultValue = "es") String locale) {
        return agreements.version(version, locale);
    }
    @GetMapping("/acceptance")
    public TermsStatus status(@AuthenticationPrincipal String principal, @RequestParam(defaultValue = "es") String locale) {
        return agreements.status(UUID.fromString(principal), locale);
    }
    @PostMapping("/acceptance")
    public TermsStatus accept(@AuthenticationPrincipal String principal, @Valid @RequestBody AcceptanceRequest request) {
        return agreements.accept(UUID.fromString(principal), request.selection());
    }
}

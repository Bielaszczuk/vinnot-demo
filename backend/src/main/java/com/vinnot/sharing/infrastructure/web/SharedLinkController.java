package com.vinnot.sharing.infrastructure.web;

import com.vinnot.sharing.application.port.in.GetSharedContentUseCase;
import com.vinnot.sharing.domain.SharedContentKind;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.sharing.domain.SharedContent;

@RestController
public class SharedLinkController {
    private final GetSharedContentUseCase content;
    private final SharedLinkHtmlRenderer renderer;
    public SharedLinkController(GetSharedContentUseCase content, SharedLinkHtmlRenderer renderer) {
        this.content = content;
        this.renderer = renderer;
    }
    @GetMapping(value = {"/share", "/share/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> app(@RequestParam(defaultValue = "es") String lang) {
        return response(200, renderer.render(null, null, null, "en".equals(lang)));
    }
    // The free CDN carries language in the origin URI; no viewer query or session is forwarded.
    @GetMapping(value = "/share/en", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> englishApp() {
        return app("en");
    }
    @GetMapping(value = "/share/{path}/{id}/en", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> englishItem(@PathVariable String path, @PathVariable String id) {
        return item(path, id, "en");
    }
    @GetMapping(value = "/share/{path}/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> item(@PathVariable String path, @PathVariable String id,
            @RequestParam(defaultValue = "es") String lang) {
        boolean english = "en".equals(lang);
        var kind = SharedContentKind.fromPath(path);
        UUID uuid = parseId(id);
        var summary = kind.isPresent() && Objects.nonNull(uuid)
                ? content.execute(kind.get(), uuid, english) : Optional.<SharedContent>empty();
        return response(summary.isPresent() ? 200 : 404,
                renderer.render(kind.orElse(null), uuid, summary.orElse(null), english));
    }
    private UUID parseId(String value) {
        if (!value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
            return null;
        }
        return UUID.fromString(value);
    }
    private ResponseEntity<String> response(int status, String html) {
        // No CDN/browser retention of titles after content is unpublished or removed.
        return ResponseEntity.status(status).contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("Content-Security-Policy", "default-src 'none'; img-src 'self' https://images.vinnot.com https://api.vinnot.com https://api-dev.vinnot.com; style-src 'self'; font-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
                .header("X-Content-Type-Options", "nosniff")
                .header("Referrer-Policy", "no-referrer")
                .header("X-Robots-Tag", "noindex, nofollow")
                .body(html);
    }
}

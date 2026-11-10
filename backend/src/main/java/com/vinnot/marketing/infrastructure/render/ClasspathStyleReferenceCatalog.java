package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.port.out.StyleReferenceCatalog;
import com.vinnot.shared.application.port.ReferenceImage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

/**
 * The bundled app illustrations (#492, converted from the mobile app's WebP artwork to PNG) that show the image model the
 * house style. Loaded once; a missing or invalid file is skipped with a warning, and with none the hero falls back.
 */
@Component
public class ClasspathStyleReferenceCatalog implements StyleReferenceCatalog {
    static final String ROOT = "marketing/references/";
    static final List<String> FILES = List.of("winery.png", "emptycellar.png", "event.png", "routes.png");
    private static final Logger LOG = LoggerFactory.getLogger(ClasspathStyleReferenceCatalog.class);
    private final Function<String, InputStream> source;
    private volatile List<ReferenceImage> loaded;

    @Autowired
    public ClasspathStyleReferenceCatalog() {
        this(path -> ClasspathStyleReferenceCatalog.class.getClassLoader().getResourceAsStream(path));
    }

    ClasspathStyleReferenceCatalog(Function<String, InputStream> source) {
        this.source = Objects.requireNonNull(source, "source");
    }

    @Override
    public List<ReferenceImage> references() {
        List<ReferenceImage> current = loaded;
        if (Objects.isNull(current)) {
            current = load();
            loaded = current;
        }
        return current;
    }

    private List<ReferenceImage> load() {
        List<ReferenceImage> references = new ArrayList<>();
        for (String file : FILES) {
            try (InputStream input = source.apply(ROOT + file)) {
                if (Objects.isNull(input)) {
                    LOG.warn("Style reference {} is missing", file);
                    continue;
                }
                references.add(new ReferenceImage(file, input.readAllBytes()));
            } catch (IOException | RuntimeException exception) {
                LOG.warn("Style reference {} is unreadable: {}", file, exception.getMessage());
            }
        }
        return List.copyOf(references);
    }
}

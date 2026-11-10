package com.vinnot.marketing.infrastructure.render;

import com.vinnot.shared.infrastructure.image.ImageResourceLimits;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * The artwork of rendered slides (#492): the paper texture, the vine ornaments and several vignettes per content
 * pillar ({@code vignettes/<PILLAR>-<n>.png}, #510),
 * read from {@code marketing/render/} on demand and never cached, so the decoded rasters do not stay in the heap. A
 * missing or unreadable file is reported once at WARN and the slide is drawn without it.
 */
@Component
public class RenderAssets {
    private static final Logger LOG = LoggerFactory.getLogger(RenderAssets.class);
    private static final String ROOT = "marketing/render/";
    private static final Pattern PILLAR_CODE = Pattern.compile("[A-Z][A-Z0-9_]{0,63}");
    private static final int MAX_VIGNETTES = 9;

    private final AssetSource source;
    private final Set<String> reported = ConcurrentHashMap.newKeySet();
    private final Map<String, List<String>> vignettes = new ConcurrentHashMap<>();

    /** Opens one asset by its classpath-style path; returns {@code null} when it does not exist. */
    @FunctionalInterface
    public interface AssetSource {
        InputStream open(String path) throws IOException;
    }

    /** The decorations a slide may draw. */
    public enum Ornament {
        CORNER_LEFT("corner-left"),
        CORNER_RIGHT("corner-right"),
        DIVIDER("divider"),
        BULLET("bullet"),
        LEAF("leaf"),
        SPRIG("sprig");

        private final String fileName;

        Ornament(String fileName) {
            this.fileName = fileName;
        }

        public String fileName() {
            return fileName;
        }
    }

    @Autowired
    public RenderAssets() {
        this(path -> RenderAssets.class.getClassLoader().getResourceAsStream(path));
    }

    public RenderAssets(AssetSource source) {
        this.source = Objects.requireNonNull(source, "source");
    }

    /** The opaque paper texture used as the canvas. */
    public Optional<BufferedImage> paper() {
        return load(ROOT + "paper.png");
    }

    public Optional<BufferedImage> ornament(Ornament ornament) {
        return load(ROOT + "ornaments/" + ornament.fileName() + ".png");
    }

    /** The pillar's first vignette. */
    public Optional<BufferedImage> vignette(String pillarCode) {
        return vignette(pillarCode, 0);
    }

    /**
     * One of the transparent vignettes of a content pillar, the cover image when a post has no illustration; {@code seed}
     * picks which one, so the same seed always gets the same vignette. Only the list of file names is kept, never the
     * rasters.
     */
    public Optional<BufferedImage> vignette(String pillarCode, int seed) {
        if (Objects.isNull(pillarCode) || !PILLAR_CODE.matcher(pillarCode).matches()) {
            return Optional.empty();
        }
        List<String> available = vignettes.computeIfAbsent(pillarCode, this::findVignettes);
        if (available.isEmpty()) {
            return missing(ROOT + "vignettes/" + pillarCode + "-*.png", "no vignette");
        }
        return load(available.get(Math.floorMod(seed, available.size())));
    }

    private List<String> findVignettes(String pillarCode) {
        List<String> found = new ArrayList<>();
        for (int index = 1; index <= MAX_VIGNETTES; index++) {
            String path = ROOT + "vignettes/" + pillarCode + "-" + index + ".png";
            if (exists(path)) {
                found.add(path);
            }
        }
        return List.copyOf(found);
    }

    private boolean exists(String path) {
        try (InputStream input = source.open(path)) {
            return Objects.nonNull(input);
        } catch (IOException | RuntimeException exception) {
            return false;
        }
    }

    private Optional<BufferedImage> load(String path) {
        try (InputStream input = source.open(path)) {
            if (Objects.isNull(input)) {
                return missing(path, "not found");
            }
            return Optional.of(decode(ImageResourceLimits.readBounded(input)));
        } catch (IOException | RuntimeException exception) {
            return missing(path, exception.getMessage());
        }
    }

    private Optional<BufferedImage> missing(String path, String reason) {
        if (reported.add(path)) {
            LOG.warn("Slide asset {} is unavailable ({}); rendering without it", path, reason);
        }
        return Optional.empty();
    }

    /** Decodes one raster after checking its dimensions, so a bad file can never allocate an oversized buffer. */
    static BufferedImage decode(byte[] bytes) throws IOException {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IOException("unsupported image");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                if (!ImageResourceLimits.acceptsDimensions(reader.getWidth(0), reader.getHeight(0))) {
                    throw new IOException("image exceeds the pixel limit");
                }
                BufferedImage image = reader.read(0);
                if (Objects.isNull(image)) {
                    throw new IOException("image cannot be decoded");
                }
                return image;
            } finally {
                reader.dispose();
            }
        }
    }
}

package com.vinnot.sharing.domain;

import java.util.Arrays;
import java.util.Optional;

public enum SharedContentKind {
    WINES("wines"), EVENTS("events"), ROUTES("wine-routes");
    private final String path;
    SharedContentKind(String path) { this.path = path; }
    public String path() { return path; }
    public static Optional<SharedContentKind> fromPath(String path) {
        return Arrays.stream(values()).filter(kind -> kind.path.equals(path)).findFirst();
    }
}

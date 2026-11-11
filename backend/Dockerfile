FROM maven:3.9-eclipse-temurin-25@sha256:93b8a14ea2f412782e4e842651273b4d903e35cc496284f178fbbe2d67d00976 AS build

WORKDIR /workspace

# Dependencies change only with pom.xml: resolving them in their own layer lets a cached
# build reuse it while sources change. The package step below still builds the same jar.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY checkstyle.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:25-jre@sha256:dbb43d81099eec91e0800226ed2296d03146ee7857165b95112372ad0d67e87f

ARG APP_REVISION=unknown
ENV APP_REVISION=${APP_REVISION}
LABEL org.opencontainers.image.revision=${APP_REVISION}

WORKDIR /app

# Refresh the packages inherited from the pinned base: OpenSSL (CVE-2026-84782) and Brotli (CVE-2026-111497).
# apt-install.sh falls back to Ubuntu mirrors on other domains when ubuntu.com does not resolve (#544).
RUN --mount=type=bind,source=docker/apt-install.sh,target=/tmp/apt-install.sh \
    sh /tmp/apt-install.sh curl libssl3t64 openssl openssl-provider-legacy webp libbrotli1 \
    && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' libssl3t64)" ge '3.5.5-1ubuntu3.6' \
    && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' libbrotli1)" ge '1.2.0-3ubuntu0.1' \
    && rm -rf /var/lib/apt/lists/*

# Nothing installs packages after this point, so drop APT instead of shipping it (CVE-2026-109518).
RUN dpkg --purge apt libapt-pkg7.0 && ! dpkg -s apt >/dev/null 2>&1

# The inherited standalone Pebble supervisor is unused: this image starts Java directly.
# Remove it instead of shipping its vulnerable Go runtime (CVE-2026-78667/78669/97031).
RUN rm -f /usr/bin/pebble && test ! -e /usr/bin/pebble

RUN addgroup --system vinnot && adduser --system --ingroup vinnot vinnot
RUN mkdir -p /app/uploads/avatars && chown -R vinnot:vinnot /app

COPY --chown=vinnot:vinnot --from=build /workspace/target/*.jar /app/vinnot-backend.jar

USER vinnot

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/vinnot-backend.jar"]

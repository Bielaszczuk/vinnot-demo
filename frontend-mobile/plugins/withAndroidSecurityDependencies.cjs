/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */
const { withAppBuildGradle } = require("expo/config-plugins");

const START = "// @generated begin vinnot-android-security";
const END = "// @generated end vinnot-android-security";
const CONSTRAINTS = [
  ["com.google.guava:guava:33.7.2-android", "CVE-2026-102554: bounded memory allocation; also covers CVE-2023-2976 and CVE-2020-8908"],
  ["com.google.code.gson:gson:2.8.9", "CVE-2022-25647: patched deserialization"],
  ["commons-io:commons-io:2.14.0", "CVE-2024-47554: bounded XML stream processing"],
  ["org.bouncycastle:bcutil-jdk15to18:1.86", "Keep ASN.1 utilities aligned with the patched provider"],
  ["org.bouncycastle:bcprov-jdk15to18:1.86", "Patched cryptographic and certificate processing"],
];

/** App-scoped minimum versions, not forced versions or new runtime dependencies. */
function applySecurityConstraints(contents, language) {
  if (language !== "groovy") {
    throw new Error("Android security constraints require a Groovy app/build.gradle");
  }
  const startCount = contents.split(START).length - 1;
  const endCount = contents.split(END).length - 1;
  if (startCount !== endCount || startCount > 1
      || (startCount === 1 && contents.indexOf(START) > contents.indexOf(END))) {
    throw new Error("Malformed Android security constraints block; refusing to overwrite Gradle content");
  }
  const base = startCount === 1
    ? contents.slice(0, contents.indexOf(START)) + contents.slice(contents.indexOf(END) + END.length)
    : contents;
  const constraints = CONSTRAINTS.map(([coordinate, reason]) =>
    `        implementation("${coordinate}") { because("${reason}") }`,
  ).join("\n");
  return `${base.trimEnd()}\n\n${START}\ndependencies {\n    constraints {\n${constraints}\n    }\n}\n${END}\n`;
}

module.exports = function withAndroidSecurityDependencies(config) {
  return withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = applySecurityConstraints(
      modConfig.modResults.contents,
      modConfig.modResults.language,
    );
    return modConfig;
  });
};
module.exports.applySecurityConstraints = applySecurityConstraints;

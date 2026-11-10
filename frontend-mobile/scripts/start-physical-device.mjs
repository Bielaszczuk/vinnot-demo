/* global console, process */

import { execFileSync, spawnSync } from "node:child_process";

const NETWORK_INTERFACES = ["en0", "en1"];

function findLocalHostname() {
  try {
    const localHostname = execFileSync("scutil", ["--get", "LocalHostName"], {
      encoding: "utf8",
    }).trim();
    return localHostname ? `${localHostname}.local` : null;
  } catch {
    return null;
  }
}

function findLanAddress() {
  for (const interfaceName of NETWORK_INTERFACES) {
    try {
      const address = execFileSync("ipconfig", ["getifaddr", interfaceName], {
        encoding: "utf8",
      }).trim();
      if (address) {
        return address;
      }
    } catch {
      // Try the next common macOS network interface.
    }
  }
  throw new Error(
    "No LAN address was found. Connect the Mac to Wi-Fi before starting Metro.",
  );
}

const lanAddress = findLanAddress();
const apiHost = findLocalHostname() ?? lanAddress;
const apiBaseUrl = `http://${apiHost}:8080/api`;

console.log(`Physical-device API: ${apiBaseUrl}`);
const metro = spawnSync(
  "npx",
  ["expo", "start", "--dev-client", "--lan", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
    },
  },
);

if (metro.error) {
  throw metro.error;
}
if (metro.status !== 0) {
  throw new Error(`Expo exited with status ${metro.status ?? "unknown"}.`);
}

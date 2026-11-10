/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro config is CommonJS tooling. */
const path = require("node:path");
const installedWatchers = new WeakSet();

// Metro and Expo CLI consume `changes` + `rootDir`, but NativeWind still emits its virtual CSS
// refresh with the older `eventsQueue` shape. Add the current contract to those events only.
function normalizeChangeEvent(event, projectRoot) {
  if (event.eventsQueue && !event.changes) {
    const rootDir = event.rootDir ?? projectRoot;
    const changes = {
      addedFiles: new Map(), modifiedFiles: new Map(), removedFiles: new Map(),
      addedDirectories: new Set(), removedDirectories: new Set(),
    };
    const collections = {
      add: changes.addedFiles, change: changes.modifiedFiles, delete: changes.removedFiles,
    };
    for (const { filePath, type, metadata } of event.eventsQueue) {
      const relativePath = path.relative(rootDir, filePath);
      if (metadata?.type === "d") {
        if (type === "add") changes.addedDirectories.add(relativePath);
        if (type === "delete") changes.removedDirectories.add(relativePath);
      } else {
        collections[type]?.set(relativePath, metadata && {
          isSymlink: metadata.type === "l",
          modifiedTime: metadata.modifiedTime ?? null,
        });
      }
    }
    return { ...event, rootDir, changes };
  }
  return event;
}

function installWatcherCompatibility(watcher, projectRoot) {
  if (installedWatchers.has(watcher)) return;
  const originalEmit = watcher.emit;
  watcher.emit = function (name, ...args) {
    if (name === "change" && args[0]) {
      args[0] = normalizeChangeEvent(args[0], projectRoot);
    }
    return originalEmit.call(this, name, ...args);
  };
  installedWatchers.add(watcher);
}

function withNativeWindWatcherCompatibility(config, projectRoot) {
  const originalMiddleware = config.server?.enhanceMiddleware;
  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware(middleware, metroServer) {
        installWatcherCompatibility(
          metroServer.getBundler().getBundler().getWatcher(), projectRoot,
        );
        return originalMiddleware
          ? originalMiddleware(middleware, metroServer)
          : middleware;
      },
    },
  };
}

module.exports = { normalizeChangeEvent, installWatcherCompatibility, withNativeWindWatcherCompatibility };

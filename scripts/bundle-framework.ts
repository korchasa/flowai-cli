// Build src/bundled.json from a pinned framework release tarball.
// Reads framework.lock, downloads framework-v<version>.tar.gz from the
// flowai GitHub release, verifies SHA-256, untars, then delegates to
// bundleFrameworkDir from bundle-framework-lib.ts.
// implements [FR-DIST.BUNDLE](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist.bundle-bundled-source)
// implements [FR-DIST.BUNDLE.PIN](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist.bundle.pin-pinned-tarball-bundle-source-post-split)
import {
  bundleFrameworkDir,
  writeVersionFile,
} from "./bundle-framework-lib.ts";
import { parseFrameworkLock, sha256Hex } from "./framework-lock.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const LOCK_PATH = `${ROOT}framework.lock`;
const OUTPUT_BUNDLE = `${ROOT}src/bundled.json`;
const OUTPUT_VERSION = `${ROOT}src/_version.ts`;
const FRAMEWORK_REPO = "korchasa/flowai";

// 1. Read CLI's own version (this repo's deno.json) for src/_version.ts.
const denoConfig = JSON.parse(
  await Deno.readTextFile(`${ROOT}deno.json`),
) as { version: string };

// 2. Read and validate framework.lock.
let lockRaw: string;
try {
  lockRaw = await Deno.readTextFile(LOCK_PATH);
} catch {
  console.error(
    "framework.lock missing. Run: deno task bump-framework <version>",
  );
  Deno.exit(2);
}
const lock = parseFrameworkLock(lockRaw);
console.log(
  `Pinned framework: v${lock.version} (commit ${lock.commit_sha.slice(0, 7)})`,
);

// 3. Download the tarball asset from the framework GitHub release.
const tarballUrl =
  `https://github.com/${FRAMEWORK_REPO}/releases/download/framework-v${lock.version}/framework.tar.gz`;
console.log(`Downloading ${tarballUrl} ...`);
const res = await fetch(tarballUrl);
if (!res.ok) {
  console.error(
    `Download failed: HTTP ${res.status} ${res.statusText} (${tarballUrl})`,
  );
  Deno.exit(3);
}
const tarballBytes = new Uint8Array(await res.arrayBuffer());

// 4. Verify SHA-256.
const actualSha = await sha256Hex(tarballBytes);
if (actualSha !== lock.tarball_sha256) {
  console.error(
    `SHA-256 mismatch.\n  expected (lock): ${lock.tarball_sha256}\n  actual (download): ${actualSha}`,
  );
  Deno.exit(4);
}
console.log(`SHA-256 OK (${actualSha.slice(0, 12)}...)`);

// 5. Untar to a fresh temp dir.
const tmpRoot = await Deno.makeTempDir({ prefix: "flowai-fw-" });
const tarballPath = `${tmpRoot}/framework.tar.gz`;
await Deno.writeFile(tarballPath, tarballBytes);
const tar = new Deno.Command("tar", {
  args: ["-xzf", tarballPath, "-C", tmpRoot],
  stdout: "inherit",
  stderr: "inherit",
});
const tarOut = await tar.output();
if (!tarOut.success) {
  console.error(`tar -xzf failed with exit code ${tarOut.code}`);
  await Deno.remove(tmpRoot, { recursive: true });
  Deno.exit(5);
}

// 6. Bundle from the extracted framework/.
const fwDir = `${tmpRoot}/framework`;
const count = await bundleFrameworkDir(fwDir, OUTPUT_BUNDLE);
console.log(`Bundled ${count} files -> src/bundled.json`);

// 7. Generate version file (CLI's own version, not framework's).
await writeVersionFile(denoConfig.version, OUTPUT_VERSION);
console.log(`Generated src/_version.ts (${denoConfig.version})`);

// 8. Cleanup.
await Deno.remove(tmpRoot, { recursive: true });

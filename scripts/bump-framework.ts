// Update framework.lock to a newer framework release.
// Usage: deno task bump-framework <version>
// Resolves the tag's commit SHA + asset SHA-256 via `gh api`, writes
// framework.lock atomically, runs `deno task bundle` to verify.
// implements [FR-DIST.BUNDLE.PIN](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist.bundle.pin-pinned-tarball-bundle-source-post-split)

const FRAMEWORK_REPO = "korchasa/flowai";

if (Deno.args.length !== 1) {
  console.error("Usage: deno task bump-framework <version>  (e.g. 0.13.0)");
  Deno.exit(64);
}
const version = Deno.args[0].replace(/^v/, "").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version '${version}'; expected MAJOR.MINOR.PATCH`);
  Deno.exit(64);
}

async function gh(args: string[]): Promise<string> {
  const cmd = new Deno.Command("gh", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  if (!out.success) {
    console.error(new TextDecoder().decode(out.stderr));
    throw new Error(`gh ${args.join(" ")} failed (exit ${out.code})`);
  }
  return new TextDecoder().decode(out.stdout).trim();
}

// 1. Resolve tag -> commit SHA.
const tag = `framework-v${version}`;
console.log(`Resolving ${FRAMEWORK_REPO}@${tag} ...`);
const refJson = await gh([
  "api",
  `repos/${FRAMEWORK_REPO}/git/refs/tags/${tag}`,
]);
const ref = JSON.parse(refJson) as {
  object: { sha: string; type: string };
};
let commit_sha = ref.object.sha;
if (ref.object.type === "tag") {
  // annotated tag -> dereference
  const tagObj = JSON.parse(
    await gh(["api", `repos/${FRAMEWORK_REPO}/git/tags/${ref.object.sha}`]),
  ) as { object: { sha: string } };
  commit_sha = tagObj.object.sha;
}
if (!/^[0-9a-f]{40}$/.test(commit_sha)) {
  console.error(`Unexpected commit_sha: ${commit_sha}`);
  Deno.exit(2);
}

// 2. Resolve release assets -> SHA-256 sidecar URL + tarball URL.
const releaseJson = await gh([
  "api",
  `repos/${FRAMEWORK_REPO}/releases/tags/${tag}`,
]);
const release = JSON.parse(releaseJson) as {
  assets: { name: string; browser_download_url: string }[];
};
const shaAsset = release.assets.find((a) =>
  a.name === "framework.tar.gz.sha256"
);
if (!shaAsset) {
  console.error(`Release ${tag} has no framework.tar.gz.sha256 asset.`);
  Deno.exit(3);
}
const shaText = await (await fetch(shaAsset.browser_download_url)).text();
const tarball_sha256 = shaText.trim().split(/\s+/)[0];
if (!/^[0-9a-f]{64}$/.test(tarball_sha256)) {
  console.error(`Malformed SHA-256 sidecar: '${shaText}'`);
  Deno.exit(3);
}

// 3. Write framework.lock atomically.
const lock =
  `# Pinned framework revision consumed by scripts/bundle-framework.ts
# Bump via: deno task bump-framework <version>
version: "${version}"
commit_sha: "${commit_sha}"
tarball_sha256: "${tarball_sha256}"
`;
const lockPath = new URL("../framework.lock", import.meta.url).pathname;
const tmpPath = `${lockPath}.tmp`;
await Deno.writeTextFile(tmpPath, lock);
await Deno.rename(tmpPath, lockPath);
console.log(
  `framework.lock -> v${version} @ ${commit_sha.slice(0, 7)} (sha256 ${
    tarball_sha256.slice(0, 12)
  }...)`,
);

// 4. Verify by running the bundle.
console.log("Verifying via deno task bundle ...");
const bundleCmd = new Deno.Command("deno", {
  args: ["task", "bundle"],
  stdout: "inherit",
  stderr: "inherit",
});
const bundleOut = await bundleCmd.output();
if (!bundleOut.success) {
  console.error(
    "Bundle failed after bump — framework.lock left in place for diagnosis.",
  );
  Deno.exit(bundleOut.code);
}
console.log("OK.");

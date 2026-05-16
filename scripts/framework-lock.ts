// framework.lock parsing + schema validation.
// Mandatory contract: any missing or malformed field aborts the bundle.
// implements [FR-DIST.BUNDLE.PIN](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist.bundle.pin-pinned-tarball-bundle-source-post-split)
import { parse as parseYaml } from "@std/yaml";

export interface FrameworkLock {
  version: string;
  commit_sha: string;
  tarball_sha256: string;
}

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const SHA_COMMIT_RE = /^[0-9a-f]{40}$/;
const SHA_256_RE = /^[0-9a-f]{64}$/;

export class FrameworkLockError extends Error {
  constructor(field: string, detail: string) {
    super(`framework.lock: invalid '${field}': ${detail}`);
    this.name = "FrameworkLockError";
  }
}

export function parseFrameworkLock(yaml: string): FrameworkLock {
  let raw: unknown;
  try {
    raw = parseYaml(yaml);
  } catch (e) {
    throw new FrameworkLockError(
      "<file>",
      `not valid YAML — ${(e as Error).message}`,
    );
  }
  if (raw === null || typeof raw !== "object") {
    throw new FrameworkLockError("<file>", "expected a YAML mapping");
  }
  const o = raw as Record<string, unknown>;
  for (const key of ["version", "commit_sha", "tarball_sha256"]) {
    if (!(key in o)) {
      throw new FrameworkLockError(key, "missing");
    }
    if (typeof o[key] !== "string") {
      throw new FrameworkLockError(
        key,
        `expected string, got ${typeof o[key]}`,
      );
    }
  }
  const version = (o.version as string).trim();
  const commit_sha = (o.commit_sha as string).trim();
  const tarball_sha256 = (o.tarball_sha256 as string).trim();
  if (!VERSION_RE.test(version)) {
    throw new FrameworkLockError(
      "version",
      `'${version}' does not match /^\\d+\\.\\d+\\.\\d+$/`,
    );
  }
  if (!SHA_COMMIT_RE.test(commit_sha)) {
    throw new FrameworkLockError(
      "commit_sha",
      `'${commit_sha}' is not a 40-char hex SHA`,
    );
  }
  if (!SHA_256_RE.test(tarball_sha256)) {
    throw new FrameworkLockError(
      "tarball_sha256",
      `'${tarball_sha256}' is not a 64-char hex SHA-256`,
    );
  }
  return { version, commit_sha, tarball_sha256 };
}

/** Compute SHA-256 hex of given bytes. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // crypto.subtle.digest rejects Uint8Array views; copy into fresh ArrayBuffer.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const out = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(out))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

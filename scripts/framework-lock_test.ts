// Tests for framework.lock schema validation.
// implements [FR-DIST.BUNDLE.PIN](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist.bundle.pin-pinned-tarball-bundle-source-post-split)
import { assertEquals, assertThrows } from "@std/assert";
import {
  FrameworkLockError,
  parseFrameworkLock,
  sha256Hex,
} from "./framework-lock.ts";

const valid = `
version: "0.13.0"
commit_sha: "0123456789abcdef0123456789abcdef01234567"
tarball_sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
`;

Deno.test("parseFrameworkLock: valid input round-trips", () => {
  const lock = parseFrameworkLock(valid);
  assertEquals(lock.version, "0.13.0");
  assertEquals(lock.commit_sha.length, 40);
  assertEquals(lock.tarball_sha256.length, 64);
});

Deno.test("parseFrameworkLock: missing field rejected", () => {
  const err = assertThrows(
    () =>
      parseFrameworkLock(
        `version: "0.1.0"\ncommit_sha: "${"a".repeat(40)}"`,
      ),
    FrameworkLockError,
  );
  assertEquals(err.message.includes("tarball_sha256"), true);
});

Deno.test("parseFrameworkLock: malformed version rejected", () => {
  const err = assertThrows(
    () =>
      parseFrameworkLock(
        `version: "v0.1"\ncommit_sha: "${"a".repeat(40)}"\ntarball_sha256: "${
          "b".repeat(64)
        }"`,
      ),
    FrameworkLockError,
  );
  assertEquals(err.message.includes("version"), true);
});

Deno.test("parseFrameworkLock: malformed commit_sha rejected", () => {
  const err = assertThrows(
    () =>
      parseFrameworkLock(
        `version: "0.1.0"\ncommit_sha: "short"\ntarball_sha256: "${
          "b".repeat(64)
        }"`,
      ),
    FrameworkLockError,
  );
  assertEquals(err.message.includes("commit_sha"), true);
});

Deno.test("parseFrameworkLock: malformed tarball_sha256 rejected", () => {
  const err = assertThrows(
    () =>
      parseFrameworkLock(
        `version: "0.1.0"\ncommit_sha: "${
          "a".repeat(40)
        }"\ntarball_sha256: "deadbeef"`,
      ),
    FrameworkLockError,
  );
  assertEquals(err.message.includes("tarball_sha256"), true);
});

Deno.test("parseFrameworkLock: non-YAML mapping rejected", () => {
  assertThrows(() => parseFrameworkLock("- a\n- b\n"), FrameworkLockError);
});

Deno.test("sha256Hex: known vector", async () => {
  const bytes = new TextEncoder().encode("abc");
  const hex = await sha256Hex(bytes);
  assertEquals(
    hex,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

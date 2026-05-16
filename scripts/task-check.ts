// Comprehensive check: bootstrap -> fmt -> lint -> type-check -> tests.
// implements [FR-DIST](https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist-global-framework-distribution-flowai)
import { writeVersionFile } from "./bundle-framework-lib.ts";

if (Deno.env.get("CLAUDECODE") === "1" && !Deno.env.get("NO_COLOR")) {
  Deno.env.set("NO_COLOR", "1");
}

const ROOT = new URL("../", import.meta.url).pathname;
const BUNDLED = `${ROOT}src/bundled.json`;
const VERSION_FILE = `${ROOT}src/_version.ts`;

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

// Bootstrap: ensure src/bundled.json + src/_version.ts exist so type-check
// and tests can run before the first real `deno task bundle`.
if (!(await exists(BUNDLED))) {
  await Deno.writeTextFile(BUNDLED, "{}\n");
  console.log("bootstrap: wrote placeholder src/bundled.json");
}
if (!(await exists(VERSION_FILE))) {
  const denoConfig = JSON.parse(
    await Deno.readTextFile(`${ROOT}deno.json`),
  ) as { version: string };
  await writeVersionFile(denoConfig.version, VERSION_FILE);
  console.log(
    `bootstrap: wrote placeholder src/_version.ts (${denoConfig.version})`,
  );
}

interface Step {
  name: string;
  cmd: string;
  args: string[];
}

const steps: Step[] = [
  { name: "fmt", cmd: "deno", args: ["fmt", "--check"] },
  { name: "lint", cmd: "deno", args: ["lint"] },
  { name: "type-check", cmd: "deno", args: ["check", "src/main.ts"] },
  { name: "test", cmd: "deno", args: ["test", "-A", "src", "scripts"] },
];

let failed = 0;
for (const s of steps) {
  console.log(`=== ${s.name}: ${s.cmd} ${s.args.join(" ")} ===`);
  const cmd = new Deno.Command(s.cmd, {
    args: s.args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const out = await cmd.output();
  if (!out.success) {
    console.error(`FAIL ${s.name} (exit ${out.code})`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} step(s) failed`);
  Deno.exit(1);
}
console.log("\nAll checks passed.");

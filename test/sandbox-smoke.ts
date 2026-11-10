/**
 * Credential-free smoke test for the Code Mode sandbox.
 *
 * Unlike test/functional.ts it needs neither HEALTHIE_API_KEY nor a generated
 * schema, so it can run in CI. It checks the parts of the server that depend on
 * the Node.js runtime: the vm sandbox's exposed surface, error handling, and
 * the timeout. Run with: npx tsx test/sandbox-smoke.ts
 */

import { executeInSandbox } from "../src/sandbox.js";

let failed = 0;

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

console.log(`Sandbox smoke test on Node ${process.versions.node}`);

await check("returns a value from async code", async () => {
  const result = await executeInSandbox("return 1 + 1");
  assert(result.success && result.result === 2, JSON.stringify(result));
});

await check("exposes no process, require or fetch", async () => {
  for (const name of ["process", "require", "fetch"]) {
    const result = await executeInSandbox(`return typeof ${name}`);
    assert(!result.success || result.result === "undefined", `${name} is reachable`);
  }
});

await check("reports syntax errors", async () => {
  const result = await executeInSandbox("this is not valid javascript }{");
  assert(!result.success && typeof result.error === "string", JSON.stringify(result));
});

await check("reports runtime errors", async () => {
  const result = await executeInSandbox('throw new Error("intentional")');
  assert(!result.success && (result.error ?? "").includes("intentional"), JSON.stringify(result));
});

await check("captures console output", async () => {
  const result = await executeInSandbox('console.log("hello"); return "done"');
  const value = result.result as { output?: unknown; logs?: unknown } | undefined;
  assert(
    result.success && value?.output === "done" && JSON.stringify(value.logs) === '["hello"]',
    JSON.stringify(result)
  );
});

if (failed > 0) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("All sandbox smoke checks passed");

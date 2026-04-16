/**
 * Regenerate the Healthie GraphQL schema via introspection.
 *
 * Usage: npm run regenerate-schema
 *
 * Downloads the full schema from the Healthie API and saves it as SDL
 * to ./schemas/<env>.graphql
 */

import { regenerateSchema } from "./src/schema.js";

async function main() {
  try {
    const result = await regenerateSchema();
    console.log(`✓ Schema saved to ${result.path} (${result.lines} lines)`);
  } catch (err) {
    console.error("Error regenerating schema:", err);
    process.exit(1);
  }
}

main();

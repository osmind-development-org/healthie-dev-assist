import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, ".env") });

export interface EnvConfig {
  apiUrl: string;
  /** API key — required for query/mutate, optional for schema-only operations */
  apiKey: string;
  /** Value for the `Healthie-GraphQL-API-Version` header on GraphQL requests */
  graphqlApiVersion: string;
  schemaPath: string;
  envName: string;
}

const DEFAULT_GRAPHQL_API_VERSION = "2025-11-30";

function resolveGraphqlApiVersion(envEntry?: { graphqlApiVersion?: string }): string {
  const fromEnv = process.env.HEALTHIE_GRAPHQL_API_VERSION?.trim();
  if (fromEnv) return fromEnv;
  const fromJson = envEntry?.graphqlApiVersion?.trim();
  if (fromJson) return fromJson;
  return DEFAULT_GRAPHQL_API_VERSION;
}

/** Headers for POST requests to the Healthie GraphQL HTTP endpoint. */
export function buildHealthieGraphqlHeaders(
  apiKey: string,
  graphqlApiVersion: string,
  options?: { authorizationSource?: boolean }
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${apiKey}`,
    "Healthie-GraphQL-API-Version": graphqlApiVersion,
  };
  if (options?.authorizationSource) {
    headers.AuthorizationSource = "API";
  }
  return headers;
}

const API_URLS: Record<string, string> = {
  staging: "https://staging-api.gethealthie.com/graphql",
};

function loadConfig(): EnvConfig {
  const envName = process.env.HEALTHIE_ENV ?? "staging";
  const schemasDir = resolve(__dirname, "schemas");
  const schemaPath = resolve(schemasDir, `${envName}.graphql`);

  // Try environments.json first (multi-env support)
  const envFilePath = process.env.ENVIRONMENTS_FILE
    ? resolve(process.env.ENVIRONMENTS_FILE)
    : resolve(__dirname, "environments.json");

  if (existsSync(envFilePath)) {
    const envFile = JSON.parse(readFileSync(envFilePath, "utf-8"));
    const envEntry = envFile[envName];
    if (envEntry) {
      return {
        apiUrl: envEntry.apiUrl,
        apiKey: envEntry.apiKey,
        graphqlApiVersion: resolveGraphqlApiVersion(envEntry),
        schemaPath,
        envName,
      };
    }
  }

  // Fall back to env vars
  // API key is optional — schema search/introspect work without it.
  // query() and mutate() will throw at call time if the key is missing.
  const apiKey = process.env.HEALTHIE_API_KEY ?? "";

  const apiUrl = API_URLS[envName];
  if (!apiUrl) {
    throw new Error(
      `Unknown HEALTHIE_ENV: "${envName}". Valid values: ${Object.keys(API_URLS).join(", ")}`
    );
  }

  return {
    apiUrl,
    apiKey,
    graphqlApiVersion: resolveGraphqlApiVersion(),
    schemaPath,
    envName,
  };
}

export const config = loadConfig();

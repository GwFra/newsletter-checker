import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryParam {
  key: string;
  value: string;
  description?: string;
}

interface PostmanRequest {
  method: string;
  url:
    | string
    | { raw: string; host: string[]; path: string[]; query: QueryParam[] };
  description?: string;
  header?: { key: string; value: string }[];
  body?: { mode: "raw"; raw: string; options: { raw: { language: "json" } } };
}

interface PostmanItem {
  name: string;
  request: PostmanRequest;
}

interface PostmanFolder {
  name: string;
  item: PostmanItem[];
}

interface PostmanCollection {
  info: { name: string; schema: string };
  variable: { key: string; value: string; type: string }[];
  item: PostmanFolder[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function folderName(routePath: string): string {
  const segment = routePath.split("/")[1];
  if (!segment) return "Health";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function friendlyName(method: string, routePath: string): string {
  const parts = routePath.split("/").filter(Boolean);
  if (parts.length === 0) return `${method} /`;

  const last = parts[parts.length - 1];
  const isParam = last.startsWith(":");
  const resource = isParam ? (parts[parts.length - 2] ?? last) : last;

  const actions: Record<string, string> = {
    GET: "Get",
    POST: "Create / trigger",
    PUT: "Update",
    PATCH: "Patch",
    DELETE: "Delete",
  };

  const verb = actions[method] ?? method;
  const label = isParam ? `${resource} by id` : resource;
  return `${verb} ${label}`;
}

/** Convert a TypeScript primitive type string to a JSON example value. */
function typeToExample(typeStr: string): unknown {
  const t = typeStr.trim().replace(/\s+/g, " ");
  if (t === "string") return "example";
  if (t === "number") return 0;
  if (t === "boolean") return true;
  if (t === "string[]") return ["example"];
  if (t.endsWith("[]")) return [];
  return "example";
}

/**
 * Given the full source of index.ts and a route's method + path, attempt to
 * extract the body shape from a nearby `Request<{}, {}, { … }>` annotation.
 */
function extractBodyExample(
  source: string,
  method: string,
  routePath: string,
): Record<string, unknown> | null {
  if (!["POST", "PUT", "PATCH"].includes(method)) return null;

  // Escape the literal path for use in a regex, turning :param into \w+
  const escapedPath = routePath
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:\\w\+/g, "\\w+") // already escaped colons from above
    .replace(/:(\w+)/g, "\\w+");

  // Cap at 400 chars so we don't bleed into the next route's handler
  const routePattern = new RegExp(
    `app\\.${method.toLowerCase()}\\(\\s*["'\`]${escapedPath}["'\`][\\s\\S]{0,400}?` +
      `Request<[^,]*,[^,]*,\\s*(\\{[^}]+\\})`,
    "",
  );

  const match = source.match(routePattern);
  if (!match) return null;

  const typeBlock = match[1]; // e.g. "{ url: string; name?: string }"
  const fieldRegex = /(\w+)\??:\s*([^;,}]+)/g;
  const example: Record<string, unknown> = {};
  let m: RegExpExecArray | null;
  while ((m = fieldRegex.exec(typeBlock)) !== null) {
    example[m[1]] = typeToExample(m[2]);
  }
  return Object.keys(example).length > 0 ? example : null;
}

/**
 * Look for `req.query.X` references in the handler block that follows the
 * route definition, and return them as Postman query params.
 */
function extractQueryParams(
  source: string,
  method: string,
  routePath: string,
): QueryParam[] {
  if (method !== "GET") return [];

  const escapedPath = routePath
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, "\\w+");

  // Grab up to 600 chars after the route declaration to find the handler body
  const routePattern = new RegExp(
    `app\\.get\\(\\s*["'\`]${escapedPath}["'\`]([\\s\\S]{0,600})`,
    "",
  );
  const routeMatch = source.match(routePattern);
  if (!routeMatch) return [];

  const handlerBlock = routeMatch[1];
  const paramRegex = /req\.query\.(\w+)/g;
  const seen = new Set<string>();
  const params: QueryParam[] = [];
  let m: RegExpExecArray | null;
  while ((m = paramRegex.exec(handlerBlock)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      params.push({ key: m[1], value: "", description: `Filter by ${m[1]}` });
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const indexPath = path.resolve(__dirname, "../index.ts");
const source = fs.readFileSync(indexPath, "utf-8");

// Extract every app.METHOD("path") declaration
const routeRegex = /app\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;
const routes: { method: string; path: string }[] = [];
let m: RegExpExecArray | null;
while ((m = routeRegex.exec(source)) !== null) {
  // Skip Express's built-in error handler (4-arg middleware — not a real route)
  if (m[0].includes("err")) continue;
  routes.push({ method: m[1].toUpperCase(), path: m[2] });
}

// Group into folders keyed by first path segment
const folders = new Map<string, PostmanItem[]>();

for (const route of routes) {
  const folder = folderName(route.path);
  if (!folders.has(folder)) folders.set(folder, []);

  const baseUrl = "{{baseUrl}}";
  const fullUrl = `${baseUrl}${route.path}`;
  const queryParams = extractQueryParams(source, route.method, route.path);
  const bodyExample = extractBodyExample(source, route.method, route.path);

  const request: PostmanRequest = {
    method: route.method,
    url:
      queryParams.length > 0
        ? {
            raw: `${fullUrl}?${queryParams.map((p) => `${p.key}=`).join("&")}`,
            host: [baseUrl],
            path: route.path.split("/").filter(Boolean),
            query: queryParams,
          }
        : fullUrl,
  };

  if (bodyExample) {
    request.header = [{ key: "Content-Type", value: "application/json" }];
    request.body = {
      mode: "raw",
      raw: JSON.stringify(bodyExample, null, 2),
      options: { raw: { language: "json" } },
    };
  }

  folders.get(folder)!.push({
    name: friendlyName(route.method, route.path),
    request,
  });
}

const collection: PostmanCollection = {
  info: {
    name: "Newsletter Checker",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000", type: "string" },
  ],
  item: Array.from(folders.entries()).map(([name, item]) => ({ name, item })),
};

const outputPath = path.resolve(__dirname, "../../postman_collection.json");
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2) + "\n");
console.log(
  `Postman collection written to ${outputPath} (${routes.length} routes across ${folders.size} folders)`,
);

import { logger } from "@/lib/logger";
import { generateProtectedResourceMetadata } from "@clerk/mcp-tools/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400"
}

export async function GET(request: Request) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    logger.error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable");
    return new Response(
      JSON.stringify({ error: "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }

  const key = publishableKey.replace(/^pk_(test|live)_/, "");
  const decoded = Buffer.from(key, "base64").toString("utf8");
  const fapiUrl = `https://${decoded.replace(/\$/, "")}`;

  logger.info(`Fetching OAuth authorization server metadata from ${fapiUrl}`);

  const metadata = generateProtectedResourceMetadata({
    authServerUrl: fapiUrl,
    resourceUrl: process.env.APP_URL || "http://localhost:3000",
    properties: {
      scopes_supported: ["profile", "email"],
    }
  });

  return new Response(JSON.stringify(metadata), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

export function OPTIONS(_: Request): Response | Promise<Response> {
  return new Response(null, {
    headers: corsHeaders
  });
}

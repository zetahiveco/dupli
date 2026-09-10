import axios from "axios";
import { logger } from "@/lib/logger";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400"
}

export async function GET(_: Request) {
  try {
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

    const metadata = await axios.get(`${fapiUrl}/.well-known/oauth-authorization-server`);

    return new Response(JSON.stringify(metadata.data), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    logger.error("Failed to fetch OAuth authorization server metadata", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch OAuth authorization server metadata" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}

export function OPTIONS(_: Request) {
  return new Response(null, {
    headers: corsHeaders
  });
}

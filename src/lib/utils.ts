import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatURL(url: string) {
  // Trim whitespace
  url = url.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);

    // Normalize hostname according to rules:
    // - Always use https
    // - If only root domain -> add www (domain.com -> www.domain.com)
    // - If subdomain present -> keep subdomain, no www
    // - If two subdomains and one is www -> drop www
    let host = parsed.hostname;
    const parts = host.split(".");

    if (parts.length >= 3) {
      // Has at least one subdomain
      if (parts[0].toLowerCase() === "www") {
        // Drop leading www when subdomain(s) exist
        host = parts.slice(1).join(".");
      } else {
        host = host;
      }
    } else if (parts.length === 2) {
      // Root domain only -> ensure www
      if (parts[0].toLowerCase() !== "www") {
        host = `www.${host.replace(/^www\./i, "")}`;
      }
    }

    // Normalize path
    let path = parsed.pathname.replace(/\/+$/, ""); // remove trailing slashes
    if (path === "") path = "/";

    // Build final URL
    return `https://${host}${path}${parsed.search}${parsed.hash}`;
  } catch (e) {
    // Handle invalid URL input
    console.error("Invalid URL:", url);
    return null;
  }
}

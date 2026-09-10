import { NextResponse } from "next/server";

export function GET() {
    return new NextResponse(
        `User-agent: *
            Allow: /
            Sitemap: https://www.dupli.dev/sitemap.xml
        `,
        { headers: { "Content-Type": "text/plain" } }
    );
}

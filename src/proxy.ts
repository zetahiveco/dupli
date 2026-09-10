import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isConsoleRoute = createRouteMatcher(["/console(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    if (isConsoleRoute(req)) {
        await auth.protect({
            unauthenticatedUrl: new URL("/auth/login", req.url).href,
        });
    }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
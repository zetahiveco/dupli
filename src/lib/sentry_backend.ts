import { config } from "dotenv"
import * as Sentry from "@sentry/node"

config({ path: ".env" })

declare global {
    var __sentryBackendInitialized: boolean | undefined
}

if (
    !globalThis.__sentryBackendInitialized &&
    process.env.NODE_ENV !== "development" &&
    process.env.SENTRY_DSN_BACKEND
) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN_BACKEND,
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV,
    })
    globalThis.__sentryBackendInitialized = true
}

export { Sentry }

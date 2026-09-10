"use client"

import * as Sentry from "@sentry/react"

const SENTRY_DSN = "https://69162bdc6e439b73752c983f2c1b3a03@o4512020363345920.ingest.us.sentry.io/4512044608258049"

if (typeof window !== "undefined" && !Sentry.getClient()) {
    Sentry.init({
        dsn: SENTRY_DSN,
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV,
        integrations: [Sentry.browserTracingIntegration()],
    })
}

export default function SentryInit({ children }: { children: React.ReactNode }) {
    return (
        <Sentry.ErrorBoundary
            fallback={({ resetError }) => (
                <div>
                    <p>Something went wrong.</p>
                    <button type="button" onClick={resetError}>
                        Try again
                    </button>
                </div>
            )}
        >
            {children}
        </Sentry.ErrorBoundary>
    )
}

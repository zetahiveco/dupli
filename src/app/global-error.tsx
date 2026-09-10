"use client"

import * as Sentry from "@sentry/react"
import { useEffect } from "react"
import "./sentry"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <html>
            <body>
                <p>Something went wrong.</p>
                <button type="button" onClick={() => reset()}>
                    Try again
                </button>
            </body>
        </html>
    )
}

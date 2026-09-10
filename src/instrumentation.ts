export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./lib/sentry_backend")
        const { startSlackPoller } = await import("./services/integrations/slack-bot")
        startSlackPoller()
    }
}

export async function onRequestError(error: { digest: string } & Error) {
    if (error.message === "Unauthorized") return
    const { Sentry } = await import("./lib/sentry_backend")
    Sentry.captureException(error)
}

export const BASE_MINUTES_PER_USER = 5_000
export const BASE_PLAN_PRICE_USD = 20

export const MINUTE_BREAKDOWN = [
    "Each organization seat is $20 per month and follows Clerk members",
    "Every seated user gets 5,000 machine-minutes per billing period",
    "Minutes are consumed while a workspace machine is running",
    "When a user is out of minutes, new runs pause until the period resets",
] as const

export function isPaidPlan(plan: string, isActive: boolean) {
    return Boolean(isActive) && (plan === "BASE" || plan === "BASE_PLAN" || plan === "CUSTOM")
}

export function isInsufficientMinutesMessage(message: string) {
    return message.toLowerCase().includes("insufficient minutes")
}

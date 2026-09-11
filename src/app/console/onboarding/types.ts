export const CREATE_WORKSPACE = "Create a workspace"
export const CREATE_API_KEY = "Generate a REST API key"
export const CONNECT_INTEGRATION = "Connect an integration"
export const TAKE_TOUR = "Take a product tour"

export const NEW_WORKSPACE_EVENT = "dupli:new-workspace"
export const PRODUCT_TOUR_EVENT = "dupli:start-product-tour"

export type SurveyQuestion = {
    question: string
    select_type: "single" | "multiple"
    options: string[]
}

export type OnboardingData = {
    completed?: string[]
}

export type SurveyAnswer = string | string[]

export type SurveyResponseData = {
    answers?: Record<string, SurveyAnswer>
    skip?: boolean
}

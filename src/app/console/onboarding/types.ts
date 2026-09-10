export const CREATE_WORKSPACE = "Create a workspace"
export const CREATE_API_KEY = "Create a API Key"
export const CONNECT_INTEGRATION = "Connect an integration"
export const EXPLORE_DATABASE = CREATE_WORKSPACE
export const CONNECT_MCP = CONNECT_INTEGRATION
export const DATABASE_TOUR_EVENT = "dupli:start-workspace-tour"

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

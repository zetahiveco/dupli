import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { parse } from "yaml"
import type { OnboardingData, SurveyQuestion, SurveyResponseData } from "./types"

export {
    CONNECT_INTEGRATION,
    CREATE_API_KEY,
    CREATE_WORKSPACE,
} from "./types"
export type {
    OnboardingData,
    SurveyAnswer,
    SurveyQuestion,
    SurveyResponseData,
} from "./types"

type RawQuestion = {
    question: string
    select_type: string
    options: string[]
}

const here = dirname(fileURLToPath(import.meta.url))

export function getChecklistItems(): string[] {
    const contents = readFileSync(join(here, "../checklist.yaml"), "utf8")
    const parsed = parse(contents) as { checklist: string[] }
    return parsed.checklist ?? []
}

export function getSurveyQuestions(): SurveyQuestion[] {
    const contents = readFileSync(join(here, "../survey_questions.yaml"), "utf8")
    const parsed = parse(contents) as { questions: RawQuestion[] }
    return (parsed.questions ?? []).map((item) => ({
        question: item.question,
        select_type: item.select_type === "multiple" ? "multiple" : "single",
        options: item.options ?? [],
    }))
}

export function parseOnboarding(value: unknown): OnboardingData {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { completed: [] }
    }
    const completed = (value as OnboardingData).completed
    return {
        completed: Array.isArray(completed) ? completed.filter((item) => typeof item === "string") : [],
    }
}

export function parseSurveyResponse(value: unknown): SurveyResponseData {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {}
    }
    return value as SurveyResponseData
}

export function shouldShowSurvey(response: SurveyResponseData): boolean {
    if (response.skip) return false
    if (response.answers && Object.keys(response.answers).length > 0) return false
    return true
}

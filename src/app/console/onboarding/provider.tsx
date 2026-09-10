"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { completeOnboardingItem, getOnboardingState, skipSurvey, submitSurvey } from "./actions"
import type { SurveyAnswer, SurveyQuestion } from "./types"
import SurveyDialog from "./survey"

type OnboardingContextValue = {
    items: string[]
    completed: string[]
    progress: number
    completeItem: (item: string) => Promise<void>
    refresh: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue>({
    items: [],
    completed: [],
    progress: 0,
    completeItem: async () => {},
    refresh: async () => {},
})

export function useOnboarding() {
    return useContext(OnboardingContext)
}

export default function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const { orgId } = useAuth()
    const [items, setItems] = useState<string[]>([])
    const [completed, setCompleted] = useState<string[]>([])
    const [questions, setQuestions] = useState<SurveyQuestion[]>([])
    const [showSurvey, setShowSurvey] = useState(false)

    const load = useCallback(async () => {
        try {
            const state = await getOnboardingState()
            setItems(state.items)
            setCompleted(state.completed)
            setQuestions(state.survey.questions)
            setShowSurvey(state.survey.shouldShow)
        } catch (error) {
            console.log("Unable to load onboarding", error)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load, orgId])

    const completeItem = useCallback(async (item: string) => {
        setCompleted((prev) => (prev.includes(item) ? prev : [...prev, item]))
        try {
            const result = await completeOnboardingItem(item)
            setCompleted(result.completed)
        } catch (error) {
            console.log("Unable to complete onboarding item", error)
            await load()
        }
    }, [load])

    const handleSkipSurvey = useCallback(async () => {
        setShowSurvey(false)
        await skipSurvey()
    }, [])

    const handleSubmitSurvey = useCallback(async (answers: Record<string, SurveyAnswer>) => {
        await submitSurvey(answers)
    }, [])

    const progress = items.length === 0 ? 0 : Math.round((completed.filter((item) => items.includes(item)).length / items.length) * 100)

    const value = useMemo<OnboardingContextValue>(() => ({
        items,
        completed,
        progress,
        completeItem,
        refresh: load,
    }), [items, completed, progress, completeItem, load])

    return (
        <OnboardingContext.Provider value={value}>
            {children}
            <SurveyDialog
                open={showSurvey && questions.length > 0}
                questions={questions}
                onSkip={handleSkipSurvey}
                onSubmit={handleSubmitSurvey}
                onClose={() => setShowSurvey(false)}
            />
        </OnboardingContext.Provider>
    )
}

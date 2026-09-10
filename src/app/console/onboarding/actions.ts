"use server"

import { prisma } from "@/lib/db"
import { requireOrg } from "@/services/auth"
import { Prisma } from "../../../../generated/prisma/client"
import {
    CONNECT_INTEGRATION,
    CREATE_API_KEY,
    CREATE_WORKSPACE,
    getChecklistItems,
    getSurveyQuestions,
    parseOnboarding,
    parseSurveyResponse,
    shouldShowSurvey,
} from "./config"
import { hasConnectedIntegration, integrationsFromSettings } from "@/services/integrations/config"
import type { SurveyAnswer } from "./types"

function toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue
}

export async function getOnboardingState() {
    const { userId, orgId } = await requireOrg()

    const [userSettings, organizationSettings, workspaceCount] = await Promise.all([
        prisma.userSettings.findUnique({ where: { userId } }),
        prisma.organizationSettings.findUnique({ where: { organizationId: orgId } }),
        prisma.workspace.count({ where: { organizationId: orgId } }),
    ])

    const onboarding = parseOnboarding(userSettings?.onboarding)
    const completed = new Set(onboarding.completed ?? [])

    if (organizationSettings?.apiKey) completed.add(CREATE_API_KEY)
    if (workspaceCount > 0) completed.add(CREATE_WORKSPACE)
    if (hasConnectedIntegration(integrationsFromSettings(organizationSettings))) {
        completed.add(CONNECT_INTEGRATION)
    }

    const snapshot = Array.from(completed)
    if (userSettings && JSON.stringify(onboarding.completed ?? []) !== JSON.stringify(snapshot)) {
        await prisma.userSettings.update({
            where: { userId },
            data: { onboarding: toJson({ completed: snapshot }) },
        })
    }

    const surveyResponse = parseSurveyResponse(organizationSettings?.surveryResponse)

    return {
        items: getChecklistItems(),
        completed: Array.from(completed),
        survey: {
            questions: getSurveyQuestions(),
            shouldShow: shouldShowSurvey(surveyResponse),
        },
    }
}

export async function completeOnboardingItem(item: string) {
    const { userId, orgId } = await requireOrg()

    const items = getChecklistItems()
    if (!items.includes(item)) {
        throw new Error("Unknown onboarding item")
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } })
    const onboarding = parseOnboarding(userSettings?.onboarding)
    const completed = new Set(onboarding.completed ?? [])
    completed.add(item)

    const payload = toJson({ completed: Array.from(completed) })

    if (userSettings) {
        await prisma.userSettings.update({
            where: { userId },
            data: { onboarding: payload },
        })
    } else {
        await prisma.userSettings.create({
            data: {
                userId,
                organizationId: orgId,
                onboarding: payload,
            },
        })
    }

    return { completed: Array.from(completed) }
}

export async function skipSurvey() {
    const { userId, orgId } = await requireOrg()

    const payload = toJson({ skip: true })

    await prisma.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: { organizationId: orgId, surveryResponse: payload },
        update: { surveryResponse: payload },
    })

    return { success: true }
}

export async function submitSurvey(answers: Record<string, SurveyAnswer>) {
    const { userId, orgId } = await requireOrg()

    const questions = getSurveyQuestions()
    const allowed = new Set(questions.map((question) => question.question))
    const sanitized: Record<string, SurveyAnswer> = {}

    for (const [question, answer] of Object.entries(answers)) {
        if (!allowed.has(question)) continue
        if (typeof answer === "string" && answer.trim()) {
            sanitized[question] = answer.trim()
        } else if (Array.isArray(answer)) {
            const values = answer.map((value) => value.trim()).filter(Boolean)
            if (values.length) sanitized[question] = values
        }
    }

    if (Object.keys(sanitized).length !== questions.length) {
        throw new Error("Please answer all questions")
    }

    const payload = toJson({ answers: sanitized, skip: false })

    await prisma.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: { organizationId: orgId, surveryResponse: payload },
        update: { surveryResponse: payload },
    })

    return { success: true }
}

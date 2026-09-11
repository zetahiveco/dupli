"use client"

import { useEffect, useRef } from "react"
import Shepherd from "shepherd.js"
import "shepherd.js/dist/css/shepherd.css"
import "./tour.css"
import { PRODUCT_TOUR_EVENT, TAKE_TOUR } from "./types"
import { useOnboarding } from "./provider"

type Step = {
    id: string
    selector: string
    title: string
    text: string
    on: "bottom" | "right" | "left" | "bottom-end" | "top"
}

const STEPS: Step[] = [
    {
        id: "new-workspace",
        selector: '[data-tour="new-workspace"]',
        title: "Start an isolated machine",
        text: "Each workspace is a fresh Linux VM. Pick Claude Code, Codex, Gemini CLI, DeepSeek Harness or opencode — the agent cannot touch your laptop.",
        on: "bottom",
    },
    {
        id: "workspaces",
        selector: '[data-tour="workspaces"]',
        title: "Your agent runs",
        text: "Open a workspace to chat with the harness. Chat, diffs, files and the terminal stay on that run.",
        on: "right",
    },
    {
        id: "automations",
        selector: '[data-tour="automations"]',
        title: "Automate the busywork",
        text: "Schedule cron jobs, listen for webhooks, or fire a run when a GitHub PR, Linear issue or Slack command comes in.",
        on: "right",
    },
    {
        id: "integrations",
        selector: '[data-tour="integrations"]',
        title: "Meet the agent in your tools",
        text: "Connect Slack, GitHub, GitLab, Bitbucket, Linear or Sentry so tickets and errors become workspace runs.",
        on: "right",
    },
    {
        id: "chat",
        selector: '[data-tour="chat"]',
        title: "Give it a real task",
        text: "Ask it to add a test, fix a bug, or write a README. It runs unattended — no approval prompts in the VM.",
        on: "top",
    },
    {
        id: "browser",
        selector: '[data-tour="browser"]',
        title: "Watch it use a computer",
        text: "The agent has a real desktop and browser. Open this tab to see screenshots and live computer use.",
        on: "bottom",
    },
    {
        id: "changes",
        selector: '[data-tour="changes"]',
        title: "Review the diff",
        text: "Every file the agent touched lands here. Keep to accept, Undo to revert. Once resolved, that file leaves the list.",
        on: "left",
    },
    {
        id: "files",
        selector: '[data-tour="files"]',
        title: "The VM filesystem",
        text: "Upload, edit and browse files on the machine. This is the same tree the harness is writing to.",
        on: "left",
    },
]

function createProductTour(onComplete: () => void) {
    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        tourName: "dupli-console",
        defaultStepOptions: {
            cancelIcon: { enabled: true, label: "Skip tour" },
            scrollTo: { behavior: "smooth", block: "nearest" },
            modalOverlayOpeningPadding: 8,
            modalOverlayOpeningRadius: 0,
            classes: "dupli-shepherd",
            canClickTarget: false,
            waitForElement: 4000,
            skipMissingElement: true,
        },
    })

    STEPS.forEach((step, index) => {
        const isFirst = index === 0
        const isLast = index === STEPS.length - 1

        tour.addStep({
            id: step.id,
            title: step.title,
            text: `<p>${step.text}</p><p class="dupli-shepherd-progress">${index + 1} of ${STEPS.length}</p>`,
            attachTo: {
                element: step.selector,
                on: step.on,
            },
            buttons: [
                {
                    text: "Skip",
                    classes: "shepherd-button-ghost",
                    action: () => tour.cancel(),
                },
                ...(!isFirst
                    ? [{
                        text: "Back",
                        secondary: true,
                        action: () => tour.back(),
                    }]
                    : []),
                {
                    text: isLast ? "Done" : "Next",
                    action: () => tour.next(),
                },
            ],
        })
    })

    tour.on("complete", onComplete)

    return tour
}

export default function ConsoleTour() {
    const { completeItem } = useOnboarding()
    const completeItemRef = useRef(completeItem)
    completeItemRef.current = completeItem
    const tourRef = useRef<ReturnType<typeof createProductTour> | null>(null)

    useEffect(() => {
        const start = () => {
            const params = new URLSearchParams(window.location.search)
            if (params.get("tour") === "1") {
                const url = new URL(window.location.href)
                url.searchParams.delete("tour")
                window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
            }

            if (tourRef.current?.isActive()) {
                tourRef.current.cancel()
            }

            const tour = createProductTour(() => {
                void completeItemRef.current(TAKE_TOUR)
            })
            tourRef.current = tour
            void tour.start()
        }

        const onStart = () => start()
        window.addEventListener(PRODUCT_TOUR_EVENT, onStart)

        if (new URLSearchParams(window.location.search).get("tour") === "1") {
            const timer = window.setTimeout(start, 350)
            return () => {
                window.clearTimeout(timer)
                window.removeEventListener(PRODUCT_TOUR_EVENT, onStart)
                if (tourRef.current?.isActive()) {
                    tourRef.current.cancel()
                }
            }
        }

        return () => {
            window.removeEventListener(PRODUCT_TOUR_EVENT, onStart)
            if (tourRef.current?.isActive()) {
                tourRef.current.cancel()
            }
        }
    }, [])

    return null
}

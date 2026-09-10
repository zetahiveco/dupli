"use client"

import { useEffect, useRef } from "react"
import Shepherd from "shepherd.js"
import "shepherd.js/dist/css/shepherd.css"
import "./tour.css"
import { DATABASE_TOUR_EVENT, EXPLORE_DATABASE } from "./types"
import { useOnboarding } from "./provider"

type Step = {
    id: string
    selector: string
    title: string
    text: string
    on: "bottom" | "right" | "left" | "bottom-end"
}

const STEPS: Step[] = [
    {
        id: "search",
        selector: '[data-tour="search"]',
        title: "Search the database",
        text: "Search across signals, accounts, and people from one place.",
        on: "bottom",
    },
    {
        id: "tabs",
        selector: '[data-tour="tabs"]',
        title: "Switch views",
        text: "Move between Signals, Accounts, and People without leaving this page.",
        on: "bottom",
    },
    {
        id: "filters",
        selector: '[data-tour="filters"]',
        title: "Filter what matters",
        text: "Narrow results by signal type, industry, location, tech stack, and more.",
        on: "right",
    },
    {
        id: "actions",
        selector: '[data-tour="actions"]',
        title: "Act on what you find",
        text: "Save lists, export CSV, or push leads once you have a selection.",
        on: "bottom-end",
    },
    {
        id: "results",
        selector: '[data-tour="results"]',
        title: "Inspect records",
        text: "Open any row to see the full record, related signals, and decision makers.",
        on: "left",
    },
]

function createDatabaseTour(onComplete: () => void) {
    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        tourName: "explore-database",
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

export default function DatabaseTour() {
    const { completeItem } = useOnboarding()
    const completeItemRef = useRef(completeItem)
    completeItemRef.current = completeItem
    const tourRef = useRef<ReturnType<typeof createDatabaseTour> | null>(null)

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

            const tour = createDatabaseTour(() => {
                void completeItemRef.current(EXPLORE_DATABASE)
            })
            tourRef.current = tour
            void tour.start()
        }

        const onStart = () => start()
        window.addEventListener(DATABASE_TOUR_EVENT, onStart)

        if (new URLSearchParams(window.location.search).get("tour") === "1") {
            const timer = window.setTimeout(start, 350)
            return () => {
                window.clearTimeout(timer)
                window.removeEventListener(DATABASE_TOUR_EVENT, onStart)
                if (tourRef.current?.isActive()) {
                    tourRef.current.cancel()
                }
            }
        }

        return () => {
            window.removeEventListener(DATABASE_TOUR_EVENT, onStart)
            if (tourRef.current?.isActive()) {
                tourRef.current.cancel()
            }
        }
    }, [])

    return null
}

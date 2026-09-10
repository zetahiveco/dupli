"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { PiArrowRight, PiCheck, PiSpinner } from "react-icons/pi"
import type { SurveyAnswer, SurveyQuestion } from "./types"

const OTHER_PREFIX = "Other"
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function isOtherOption(option: string) {
    return option.startsWith(OTHER_PREFIX)
}

function formatAnswer(selected: string[], other: string): SurveyAnswer {
    const values = selected.map((option) => {
        if (isOtherOption(option) && other.trim()) {
            return `${OTHER_PREFIX}: ${other.trim()}`
        }
        return option
    })
    return values.length === 1 ? values[0] : values
}

function isAnswered(question: SurveyQuestion, selected: string[], other: string) {
    if (selected.length === 0) return false
    if (selected.some(isOtherOption) && !other.trim()) return false
    if (question.select_type === "single") return selected.length === 1
    return true
}

export default function SurveyDialog({
    open,
    questions,
    onSkip,
    onSubmit,
    onClose,
}: {
    open: boolean
    questions: SurveyQuestion[]
    onSkip: () => Promise<void>
    onSubmit: (answers: Record<string, SurveyAnswer>) => Promise<void>
    onClose: () => void
}) {
    const [index, setIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
    const [selected, setSelected] = useState<string[]>([])
    const [other, setOther] = useState("")
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState("")
    const busyRef = useRef(false)

    const question = questions[index]
    const total = questions.length
    const answered = question ? isAnswered(question, selected, other) : false
    const progress = total === 0 ? 0 : done ? 100 : ((index + (answered ? 0.45 : 0)) / total) * 100
    const otherSelected = selected.some(isOtherOption)
    const isLast = index === total - 1

    useEffect(() => {
        if (!open) return
        setIndex(0)
        setAnswers({})
        setSelected([])
        setOther("")
        setSaving(false)
        setDone(false)
        setError("")
        busyRef.current = false
    }, [open])

    const goNext = useCallback(async (nextSelected: string[], nextOther: string) => {
        if (!question || saving || done || busyRef.current) return
        if (!isAnswered(question, nextSelected, nextOther)) return

        busyRef.current = true
        const nextAnswers = {
            ...answers,
            [question.question]: formatAnswer(nextSelected, nextOther),
        }
        setAnswers(nextAnswers)

        if (index < questions.length - 1) {
            setIndex((prev) => prev + 1)
            setSelected([])
            setOther("")
            setError("")
            busyRef.current = false
            return
        }

        try {
            setSaving(true)
            await onSubmit(nextAnswers)
            setDone(true)
            window.setTimeout(onClose, 1400)
        } catch (err) {
            console.log(err)
            setError("Could not save your answers. Please try again.")
            busyRef.current = false
        } finally {
            setSaving(false)
        }
    }, [answers, done, index, onClose, onSubmit, question, questions.length, saving])

    const toggleOption = useCallback((option: string) => {
        if (!question || saving || done) return

        if (question.select_type === "single") {
            setSelected([option])
            if (!isOtherOption(option)) setOther("")
            return
        }

        setSelected((prev) => {
            if (prev.includes(option)) {
                if (isOtherOption(option)) setOther("")
                return prev.filter((item) => item !== option)
            }
            return [...prev, option]
        })
    }, [done, question, saving])

    useEffect(() => {
        if (!open || !question || done) return

        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target
            const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

            if (event.key === "Enter") {
                event.preventDefault()
                void goNext(selected, other)
                return
            }

            if (typing) return

            const optionIndex = LETTERS.indexOf(event.key.toUpperCase())
            if (optionIndex >= 0 && optionIndex < question.options.length) {
                event.preventDefault()
                toggleOption(question.options[optionIndex])
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [done, goNext, open, other, question, selected, toggleOption])

    const handleSkip = async () => {
        if (saving) return
        setSaving(true)
        try {
            await onSkip()
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open}>
            <DialogContent
                showCloseButton={false}
                onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
                className="flex h-[90vh] w-[90vw] max-w-none sm:max-w-none flex-col gap-0 p-0 overflow-hidden"
            >
                <DialogTitle className="sr-only">Welcome survey</DialogTitle>
                <DialogDescription className="sr-only">
                    A short survey to help us understand how you plan to use Monial.
                </DialogDescription>

                <div className="flex items-center gap-4 border-b px-6 py-4">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => void handleSkip()} disabled={saving || done}>
                        Skip
                    </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-6 py-12">
                        {done ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">You&apos;re in</p>
                                <h2 className="text-4xl font-semibold tracking-tight">Thanks — we&apos;ll use this to improve Monial.</h2>
                            </div>
                        ) : question ? (
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {index + 1} <span className="text-muted-foreground/60">→</span>
                                    </p>
                                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                                        {question.question}
                                    </h2>
                                    {question.select_type === "multiple" && (
                                        <p className="text-sm text-muted-foreground">Select all that apply</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {question.options.map((option, optionIndex) => {
                                        const active = selected.includes(option)
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => toggleOption(option)}
                                                className={cn(
                                                    "w-full text-left border px-4 py-3 flex items-center gap-3 transition-colors",
                                                    active
                                                        ? "border-primary bg-primary/5"
                                                        : "border-white/10 hover:border-primary/50 hover:bg-white/[0.04]"
                                                )}
                                            >
                                                <span className={cn(
                                                    "size-7 shrink-0 border text-xs font-medium flex items-center justify-center",
                                                    active ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 text-muted-foreground"
                                                )}>
                                                    {active ? <PiCheck className="size-3.5" /> : LETTERS[optionIndex]}
                                                </span>
                                                <span className="text-base">{option}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {otherSelected && (
                                    <Input
                                        autoFocus
                                        value={other}
                                        onChange={(event) => setOther(event.target.value)}
                                        placeholder="Please specify"
                                        className="h-11"
                                    />
                                )}

                                {error && <p className="text-sm text-destructive">{error}</p>}

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => void goNext(selected, other)}
                                        disabled={!answered || saving}
                                        className="min-w-28"
                                    >
                                        {saving ? (
                                            <PiSpinner className="animate-spin" />
                                        ) : (
                                            <>
                                                {isLast ? "Submit" : "OK"}
                                                <PiArrowRight />
                                            </>
                                        )}
                                    </Button>
                                    <span className="text-xs text-muted-foreground">press Enter ↵</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

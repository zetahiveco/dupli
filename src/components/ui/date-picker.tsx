"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function DatePicker({
    id,
    value,
    onChange,
    placeholder = "Select date",
    disabled,
    disabledDates,
    className,
}: {
    id?: string
    value?: Date
    onChange: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    disabledDates?: React.ComponentProps<typeof Calendar>["disabled"]
    className?: string
}) {
    const [open, setOpen] = React.useState(false)

    return (
        <div className={cn("min-w-0 w-full", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        id={id}
                        disabled={disabled}
                        className={cn(
                            "w-full min-w-0 justify-between px-2 font-normal",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <span className="truncate">
                            {value
                                ? value.toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                  })
                                : placeholder}
                        </span>
                        <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value}
                        captionLayout="dropdown"
                        disabled={disabledDates}
                        startMonth={new Date(2018, 0)}
                        endMonth={new Date()}
                        onSelect={(date) => {
                            onChange(date)
                            setOpen(false)
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}

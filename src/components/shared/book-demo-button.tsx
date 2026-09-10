"use client"

import { getCalApi } from "@calcom/embed-react"
import { useEffect, type ComponentProps } from "react"
import { Button } from "@/components/ui/button"

const CAL_NAMESPACE = "dupli-discussion"
const CAL_LINK = "harish-deivanayagam/dupli-discussion"
const CAL_CONFIG = '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'

function useCalEmbed() {
  useEffect(() => {
    ;(async function () {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE })
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" })
    })()
  }, [])
}

type BookDemoButtonProps = ComponentProps<typeof Button>

export function BookDemoButton({
  children = "Book a demo",
  ...props
}: BookDemoButtonProps) {
  useCalEmbed()

  return (
    <Button
      type="button"
      data-cal-namespace={CAL_NAMESPACE}
      data-cal-link={CAL_LINK}
      data-cal-config={CAL_CONFIG}
      {...props}
    >
      {children}
    </Button>
  )
}

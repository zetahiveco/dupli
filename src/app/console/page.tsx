"use client"

import { useEffect } from "react"

export default function ConsoleHome() {
    useEffect(() => {
        window.location.href = "/console/workspaces"
    }, [])
}

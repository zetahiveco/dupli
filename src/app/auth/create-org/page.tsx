"use client"

import { CreateOrganization, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default function CreateOrgPage() {

    const { isSignedIn, isLoaded, orgId } = useAuth()
    const router = useRouter()


    useEffect(() => {
        if (isSignedIn && isLoaded && orgId) {
            router.push("/console")
        }
    }, [isSignedIn, isLoaded])

    return <CreateOrganization appearance={clerkAppearance} />
}

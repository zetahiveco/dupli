"use client"

import { SignIn, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default function LoginPage() {

    const { isSignedIn, isLoaded, userId, orgId } = useAuth()
    const router = useRouter()


    useEffect(() => {

        if (isSignedIn && isLoaded && userId && !orgId) {
            router.push("/auth/create-org")
        }

        if (isSignedIn && isLoaded && userId && orgId) {
            router.push("/console")
        }
    }, [isSignedIn, isLoaded])

    return <SignIn appearance={clerkAppearance} signUpUrl="/auth/signup" />
}

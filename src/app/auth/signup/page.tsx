"use client"

import { SignUp, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default function SignupPage() {

    const { isSignedIn, isLoaded, userId, orgId } = useAuth()
    const router = useRouter()


    useEffect(() => {
        if (isSignedIn && isLoaded && userId) {
            router.push("/auth/create-org")
        }

        if (isSignedIn && isLoaded && userId && orgId) {
            router.push("/console")
        }
    }, [isSignedIn, isLoaded])

    return <SignUp appearance={clerkAppearance} signInUrl="/auth/login" />
}

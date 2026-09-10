"use client"

import { useAuth } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { PiSpinner } from "react-icons/pi"
import { fetchBilling, onboardApp } from "./actions"
import { BillingContext } from "./billing"
import OnboardingProvider from "./onboarding/provider"
import BillingGate from "./billing-gate"

export default function ConsoleProvider({ children }: { children: React.ReactNode }) {

    const { isSignedIn, isLoaded, orgId } = useAuth()
    const [isOnboarding, setIsOnboarding] = useState(true)
    const [error, setError] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const [billing, setBilling] = useState<any>(null);

    const handleFetchBilling = useCallback(async () => {
        try {
            const billing = await fetchBilling()
            setBilling(billing)
        } catch(err) {
            console.log(`Unable to fetch billing`, err)
        }
    }, [])

    const handleOnboarding = async () => {
        try {
            const result = await onboardApp()
            if (result?.success) setIsOnboarding(false)
        } catch (err) {
            console.log(`Unable to onboard`, err)
            setError(true)
        }
    }

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn) {
            router.push("/auth/login")
            return
        }
        if (!orgId) {
            router.push("/auth/create-org")
            return
        }
        void handleOnboarding()
    }, [isLoaded, isSignedIn, orgId])

    useEffect(() => {
        if(!isOnboarding) {
            handleFetchBilling()
        }
    }, [isOnboarding, pathname, handleFetchBilling])

    useEffect(() => {
        const onRefresh = () => {
            void handleFetchBilling()
        }
        window.addEventListener("billing:refresh", onRefresh)
        return () => window.removeEventListener("billing:refresh", onRefresh)
    }, [handleFetchBilling])

    if (error) {
        return <div className="flex items-center justify-center w-screen h-screen">Unable to onboard user. Contact support.</div>
    }

    if (isOnboarding) {
        return <div className="flex items-center justify-center w-screen h-screen"><PiSpinner className="animate-spin" /></div>
    }

    return (
        <BillingContext.Provider value={{ billing, refresh: handleFetchBilling }}>
            <OnboardingProvider>
                {children}
            </OnboardingProvider>
            <BillingGate />
        </BillingContext.Provider>
    )
}

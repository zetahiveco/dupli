"use client"

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web"

export default function CrispChat() {

    const { user } = useUser()

    useEffect(() => {
        const websiteId = "503fa251-4b37-406f-aa93-9a38a4bb49a8";
        if (user) {
            Crisp.configure(websiteId);
            const email = user.emailAddresses[0]?.emailAddress
            if (email) {
                Crisp.user.setEmail(email)
            }
            Crisp.user.setNickname(user.fullName || "Untitled")
        }

        if (!user) {
            Crisp.configure(websiteId);
        }
    }, [user]);

    return <></>;
}

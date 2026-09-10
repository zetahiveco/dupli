import { redirect } from "next/navigation"

export default function SlackCallbackPage() {
    redirect("/console/integrations")
}

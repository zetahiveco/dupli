import { redirect } from "next/navigation"
import { listOrgWorkspaces } from "../workspaces/actions"

export default async function WorkspaceAliasPage() {
    const rows = await listOrgWorkspaces()
    if (rows[0]) redirect(`/console/workspaces/${rows[0].id}`)
    redirect("/console/workspaces")
}

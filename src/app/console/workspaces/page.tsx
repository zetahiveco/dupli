import { redirect } from "next/navigation"
import { listOrgWorkspaces } from "./actions"
import EmptyWorkspaces from "./empty"

export default async function WorkspacesPage() {
    const rows = await listOrgWorkspaces()
    if (rows[0]) redirect(`/console/workspaces/${rows[0].id}`)
    return <EmptyWorkspaces />
}

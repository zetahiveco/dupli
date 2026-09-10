import ConsoleProvider from "./provider"
import ConsoleShell from "./shell"

export default function ConsoleLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ConsoleProvider>
            <ConsoleShell>{children}</ConsoleShell>
        </ConsoleProvider>
    )
}

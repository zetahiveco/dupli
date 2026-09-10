/**
 * Shared Clerk theming. Clerk's own card is the single glass panel on auth
 * screens, so the surrounding layout must not add another one.
 *
 * Element overrides are plain style objects rather than class names: Clerk
 * injects its stylesheet at runtime, which outranks Tailwind's layered
 * utilities, so classes silently lose on anything Clerk already styles.
 */
const transparentSurface = {
    background: "transparent",
    boxShadow: "none",
    border: "none",
} as const

export const clerkAppearance = {
    layout: {
        socialButtonsVariant: "blockButton" as const,
        logoPlacement: "none" as const,
    },
    variables: {
        colorPrimary: "#ff8437",
        colorNeutral: "#f4f4f6",
        colorText: "#f4f4f6",
        colorTextSecondary: "#8b8b99",
        colorTextOnPrimaryBackground: "#ffffff",
        colorBackground: "#0e0e12",
        colorInputBackground: "rgba(255,255,255,0.06)",
        colorInputText: "#f4f4f6",
        borderRadius: "0px",
        fontFamily: "Geist, sans-serif",
    },
    elements: {
        rootBox: { width: "100%" },
        cardBox: {
            width: "100%",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(14, 14, 18, 0.82)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
        },
        card: {
            ...transparentSurface,
            width: "100%",
            padding: "2rem",
            gap: "1.5rem",
        },
        scrollBox: transparentSurface,
        main: transparentSurface,
        header: { gap: "0.25rem" },
        headerTitle: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.01em", color: "#f6f5f3" },
        headerSubtitle: { fontSize: "0.875rem", color: "#8b8b99" },
        socialButtonsBlockButton: {
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "#f4f4f6",
        },
        dividerLine: { background: "rgba(255,255,255,0.12)" },
        dividerText: { fontSize: "0.75rem", letterSpacing: "0.06em", color: "#8b8b99" },
        formFieldLabel: { fontSize: "0.75rem", fontWeight: 500, color: "#a6a6b4" },
        formFieldInput: { border: "1px solid rgba(255,255,255,0.14)", color: "#f4f4f6" },
        formButtonPrimary: {
            fontSize: "0.875rem",
            fontWeight: 500,
            textTransform: "none" as const,
            boxShadow: "none",
            background: "#ff8437",
            color: "#ffffff",
        },
        footer: transparentSurface,
        footerAction: transparentSurface,
        footerActionLink: { color: "#ff8437", fontWeight: 500 },
        organizationPreviewMainIdentifier: { color: "#f4f4f6" },
        organizationPreviewSecondaryIdentifier: { color: "#8b8b99" },
        organizationSwitcherTrigger: { color: "#f4f4f6" },
        organizationSwitcherTriggerIcon: { color: "#c8c8d0" },
        organizationSwitcherPopoverActionButton: { color: "#f4f4f6" },
        organizationSwitcherPopoverActionButtonIcon: { color: "#f4f4f6" },
        organizationSwitcherPreviewButton: { color: "#f4f4f6" },
        organizationListPreviewItemActionButton: { color: "#f4f4f6" },
        organizationListCreateOrganizationActionButton: { color: "#f4f4f6" },
        userButtonPopoverActionButton: { color: "#f4f4f6" },
        userButtonPopoverActionButtonIcon: { color: "#f4f4f6" },
        userPreviewMainIdentifier: { color: "#f4f4f6" },
        userPreviewSecondaryIdentifier: { color: "#8b8b99" },
    },
}

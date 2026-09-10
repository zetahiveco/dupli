export type IntegrationProvider = "unipile" | "zernio" | "stripe" | null

export type IntegrationDefinition = {
    platform: string
    name: string
    description: string
    logo: string
    provider: IntegrationProvider
    /** Zernio path segment, e.g. "twitter" */
    zernioPlatform?: string
    /** Zernio connection mode */
    zernioConnectType?: "social" | "ads" | "openai_ads_credentials"
    /** Unipile hosted-auth providers list */
    unipileProviders?: string[]
}


export const INTEGRATIONS: IntegrationDefinition[] = [
    {
        platform: "EMAIL",
        name: "Email",
        description: "Connect Gmail, Outlook, or IMAP for outbound email",
        logo: "/integrations/email.svg",
        provider: "unipile",
        unipileProviders: ["GOOGLE", "MICROSOFT", "IMAP"],
    },
    {
        platform: "LINKEDIN_OUTBOUND",
        name: "LinkedIn Outbound",
        description: "Connect LinkedIn for outbound messaging via Unipile",
        logo: "/integrations/linkedin.svg",
        provider: "unipile",
        unipileProviders: ["LINKEDIN"],
    },
    {
        platform: "LINKEDIN",
        name: "LinkedIn",
        description: "Publish and manage LinkedIn content",
        logo: "/integrations/linkedin.svg",
        provider: "zernio",
        zernioPlatform: "linkedin",
        zernioConnectType: "social",
    },
    {
        platform: "INSTAGRAM",
        name: "Instagram",
        description: "Publish and manage Instagram content",
        logo: "/integrations/instagram.svg",
        provider: "zernio",
        zernioPlatform: "instagram",
        zernioConnectType: "social",
    },
    {
        platform: "TWITTER",
        name: "X (Twitter)",
        description: "Publish and manage posts on X",
        logo: "/integrations/twitter.svg",
        provider: "zernio",
        zernioPlatform: "twitter",
        zernioConnectType: "social",
    },
    {
        platform: "YOUTUBE",
        name: "YouTube",
        description: "Publish and manage YouTube content",
        logo: "/integrations/youtube.svg",
        provider: "zernio",
        zernioPlatform: "youtube",
        zernioConnectType: "social",
    },
    {
        platform: "FACEBOOK",
        name: "Facebook",
        description: "Publish and manage Facebook Pages",
        logo: "/integrations/facebook.svg",
        provider: "zernio",
        zernioPlatform: "facebook",
        zernioConnectType: "social",
    },
    {
        platform: "WHATSAPP",
        name: "WhatsApp",
        description: "Connect WhatsApp for messaging",
        logo: "/integrations/whatsapp.svg",
        provider: "zernio",
        zernioPlatform: "whatsapp",
        zernioConnectType: "social",
    },
    {
        platform: "DISCORD",
        name: "Discord",
        description: "Connect Discord for community messaging",
        logo: "/integrations/discord.svg",
        provider: "zernio",
        zernioPlatform: "discord",
        zernioConnectType: "social",
    },
    {
        platform: "REDDIT",
        name: "Reddit",
        description: "Publish and manage Reddit content",
        logo: "/integrations/reddit.svg",
        provider: "zernio",
        zernioPlatform: "reddit",
        zernioConnectType: "social",
    },
    {
        platform: "TIKTOK",
        name: "TikTok",
        description: "Publish and manage TikTok content",
        logo: "/integrations/tiktok.svg",
        provider: "zernio",
        zernioPlatform: "tiktok",
        zernioConnectType: "social",
    },
    {
        platform: "GOOGLE_MY_BUSINESS",
        name: "Google Business",
        description: "Manage Google Business Profile",
        logo: "/integrations/google-my-business.svg",
        provider: "zernio",
        zernioPlatform: "googlebusiness",
        zernioConnectType: "social",
    },
    {
        platform: "META_ADS",
        name: "Meta Ads",
        description: "Connect Meta advertising accounts",
        logo: "/integrations/meta.svg",
        provider: "zernio",
        zernioPlatform: "facebook",
        zernioConnectType: "ads",
    },
    {
        platform: "TWITTER_ADS",
        name: "X Ads",
        description: "Connect X advertising accounts",
        logo: "/integrations/twitter.svg",
        provider: "zernio",
        zernioPlatform: "twitter",
        zernioConnectType: "ads",
    },
    {
        platform: "TIKTOK_ADS",
        name: "TikTok Ads",
        description: "Connect TikTok advertising accounts",
        logo: "/integrations/tiktok.svg",
        provider: "zernio",
        zernioPlatform: "tiktok",
        zernioConnectType: "ads",
    },
    {
        platform: "LINKEDIN_ADS",
        name: "LinkedIn Ads",
        description: "Connect LinkedIn advertising accounts",
        logo: "/integrations/linkedin.svg",
        provider: "zernio",
        zernioPlatform: "linkedin",
        zernioConnectType: "ads",
    },
    {
        platform: "GOOGLE_ADS",
        name: "Google Ads",
        description: "Connect Google advertising accounts",
        logo: "/integrations/google-ads.svg",
        provider: "zernio",
        zernioPlatform: "googleads",
        zernioConnectType: "ads",
    },
    {
        platform: "OPENAI_ADS",
        name: "OpenAI Ads",
        description: "Connect OpenAI advertising",
        logo: "/integrations/openai.svg",
        provider: "zernio",
        zernioConnectType: "openai_ads_credentials",
    },
    {
        platform: "SALESFORCE",
        name: "Salesforce",
        description: "Sync leads and CRM data with Salesforce",
        logo: "/integrations/salesforce.svg",
        provider: null,
    },
    {
        platform: "HUBSPOT",
        name: "HubSpot",
        description: "Sync leads and CRM data with HubSpot",
        logo: "/integrations/hubspot.svg",
        provider: null,
    },
    {
        platform: "STRIPE",
        name: "Stripe",
        description: "Connect Stripe for payments data",
        logo: "/integrations/stripe.svg",
        provider: "stripe",
    },
]

export function getIntegrationDefinition(platform: string) {
    return INTEGRATIONS.find((item) => item.platform === platform)
}

export const ZERNIO_PLATFORM_TO_INTEGRATION: Record<string, string> = {
    linkedin: "LINKEDIN",
    linkedinads: "LINKEDIN_ADS",
    instagram: "INSTAGRAM",
    twitter: "TWITTER",
    xads: "TWITTER_ADS",
    youtube: "YOUTUBE",
    facebook: "FACEBOOK",
    metaads: "META_ADS",
    whatsapp: "WHATSAPP",
    discord: "DISCORD",
    reddit: "REDDIT",
    tiktok: "TIKTOK",
    tiktokads: "TIKTOK_ADS",
    googlebusiness: "GOOGLE_MY_BUSINESS",
    googleads: "GOOGLE_ADS",
    openaiads: "OPENAI_ADS",
}

export type IntegrationConfig = {
    provider: "unipile" | "zernio" | "stripe"
    accountId: string
    profileId?: string
    username?: string
    unipileProvider?: string
    apiKey?: string
    keyPreview?: string
}

export type IntegrationRow = {
    id: string
    platform: string
    config: IntegrationConfig
    createdAt: Date
    updatedAt: Date
}


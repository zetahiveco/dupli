-- CreateEnum
CREATE TYPE "Harness" AS ENUM ('CLAUDE_CODEX', 'OPENAI_CODEX', 'GEMINI_CLI', 'DEEPSEEK_HARNESS', 'FX', 'KIMI_CODE', 'OPENCODE', 'MUSE_CODE', 'PI');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('VIA_WEBHOOK', 'VIA_CRON', 'VIA_API', 'VIA_GITHUB', 'VIA_GITLAB', 'VIA_BITBUCKET', 'VIA_LINEAR', 'VIA_SLACK', 'VIA_SENTRY');

-- CreateEnum
CREATE TYPE "AutomationWorkspace" AS ENUM ('USE_EXISTING', 'CREATE_NEW');

-- CreateEnum
CREATE TYPE "WorkspaceBilling" AS ENUM ('USE_TOKENS', 'USE_API_KEY');

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "environmentVariables" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "environmentVariables" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "harness" "Harness" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "additionalConfig" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "billingType" "WorkspaceBilling" NOT NULL DEFAULT 'USE_TOKENS',
    "name" TEXT,
    "harness" "Harness" NOT NULL,
    "sandboxId" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationConfig" JSONB DEFAULT '{}',
    "trigger" "AutomationTrigger" NOT NULL,
    "workspaceAction" "AutomationWorkspace" NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "workspaceId" TEXT,
    "newWorkspaceConfig" JSONB DEFAULT '{}',
    "cron" TEXT,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

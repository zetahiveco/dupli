-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "integrationsConfig" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "minutesUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "minutesResetAt" TIMESTAMP(3);
ALTER TABLE "UserSettings" ADD COLUMN "minuteCursors" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Billing" DROP COLUMN "baseCredits";
ALTER TABLE "Billing" DROP COLUMN "additionalCredits";
ALTER TABLE "Billing" DROP COLUMN "creditsUsed";
ALTER TABLE "Billing" DROP COLUMN "creditsResetAt";
ALTER TABLE "Billing" ADD COLUMN "minutesResetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "billingType";

-- DropEnum
DROP TYPE "WorkspaceBilling";

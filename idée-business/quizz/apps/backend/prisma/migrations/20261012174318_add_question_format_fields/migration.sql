-- AlterTable
ALTER TABLE "questions" ADD COLUMN "enabledForDaily" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "questions" ADD COLUMN "enabledForMcq" BOOLEAN NOT NULL DEFAULT false;

-- Update existing questions: océans/rivières categories → mcq-only
UPDATE "questions"
SET "enabledForDaily" = false, "enabledForMcq" = true
WHERE "categoryId" IN (
  SELECT id FROM "categories"
  WHERE slug IN ('geographie-oceans', 'geographie-rivieres')
);

-- Update all other existing questions → both formats
UPDATE "questions"
SET "enabledForMcq" = true
WHERE "categoryId" NOT IN (
  SELECT id FROM "categories"
  WHERE slug IN ('geographie-oceans', 'geographie-rivieres')
) OR "categoryId" IS NULL;

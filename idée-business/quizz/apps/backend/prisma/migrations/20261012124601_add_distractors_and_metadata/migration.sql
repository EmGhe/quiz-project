-- AlterTable
ALTER TABLE "reponses_acceptees" ADD COLUMN     "levenshteinThreshold" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "distractors" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "distractorText" TEXT NOT NULL,
    "wikidataSourceId" TEXT,
    "plausibilityScore" INTEGER,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_metadata" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "successRate" DECIMAL(5,2),
    "avgTimeMs" INTEGER,
    "timesAsked" INTEGER NOT NULL DEFAULT 0,
    "skipRate" DECIMAL(5,2),
    "userReports" JSONB,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "lastAsked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "distractors_questionId_order_key" ON "distractors"("questionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "question_metadata_questionId_key" ON "question_metadata"("questionId");

-- AddForeignKey
ALTER TABLE "distractors" ADD CONSTRAINT "distractors_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_metadata" ADD CONSTRAINT "question_metadata_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

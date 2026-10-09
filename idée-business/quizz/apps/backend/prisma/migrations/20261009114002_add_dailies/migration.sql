-- CreateTable
CREATE TABLE "dailies" (
    "id" TEXT NOT NULL,
    "dailyNumber" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dailies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_questions" (
    "id" TEXT NOT NULL,
    "dailyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "daily_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalTime" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "answersData" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dailies_dailyNumber_key" ON "dailies"("dailyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dailies_date_key" ON "dailies"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_questions_dailyId_order_key" ON "daily_questions"("dailyId", "order");

-- CreateIndex
CREATE INDEX "daily_submissions_dailyId_score_idx" ON "daily_submissions"("dailyId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "daily_submissions_userId_dailyId_key" ON "daily_submissions"("userId", "dailyId");

-- AddForeignKey
ALTER TABLE "daily_questions" ADD CONSTRAINT "daily_questions_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "dailies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_questions" ADD CONSTRAINT "daily_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_submissions" ADD CONSTRAINT "daily_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_submissions" ADD CONSTRAINT "daily_submissions_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "dailies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

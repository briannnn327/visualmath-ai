-- Catatan jawaban per soal per sesi latihan.
-- Mendukung anti-farming XP dan rekap sesi yang dihitung di server.
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "timeMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- Satu soal hanya boleh dicatat sekali dalam satu sesi.
CREATE UNIQUE INDEX "QuestionAttempt_sessionId_questionId_key"
    ON "QuestionAttempt"("sessionId", "questionId");

-- Mempercepat pengecekan XP pertama & rekap sesi.
CREATE INDEX "QuestionAttempt_userId_questionId_idx"
    ON "QuestionAttempt"("userId", "questionId");
CREATE INDEX "QuestionAttempt_userId_sessionId_idx"
    ON "QuestionAttempt"("userId", "sessionId");

ALTER TABLE "QuestionAttempt"
    ADD CONSTRAINT "QuestionAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttempt"
    ADD CONSTRAINT "QuestionAttempt_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttempt"
    ADD CONSTRAINT "QuestionAttempt_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

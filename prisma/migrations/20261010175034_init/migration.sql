-- CreateEnum
CREATE TYPE "Role" AS ENUM ('mahasiswa', 'dosen', 'admin');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('mudah', 'sedang', 'sulit');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('numeric', 'choice', 'truefalse');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('materi', 'soal');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('formula', 'quiz', 'lesson', 'auth', 'graph', 'system');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('info', 'warning', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nim" TEXT,
    "prodi" TEXT,
    "kelasId" TEXT,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "formulaCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "latex" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "hint" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "mastery" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "solved" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "HistoryRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "score" INTEGER,
    "xp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "severity" "LogSeverity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "stepExplain" BOOLEAN NOT NULL,
    "adaptiveQuiz" BOOLEAN NOT NULL,
    "graphSimulation" BOOLEAN NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "difficulty" "Difficulty",
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryRecord" ADD CONSTRAINT "HistoryRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaRecord" ADD CONSTRAINT "FormulaRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaRecord" ADD CONSTRAINT "FormulaRecord_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

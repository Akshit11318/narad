/*
  Warnings:

  - You are about to drop the column `electionId` on the `aggregated_results` table. All the data in the column will be lost.
  - You are about to drop the column `electionId` on the `voter_data` table. All the data in the column will be lost.
  - You are about to drop the `election_params` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elections` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[voterId]` on the table `voter_data` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "elections" DROP CONSTRAINT "elections_electionParamsId_fkey";

-- DropForeignKey
ALTER TABLE "voter_data" DROP CONSTRAINT "voter_data_electionId_fkey";

-- DropIndex
DROP INDEX "aggregated_results_electionId_key";

-- DropIndex
DROP INDEX "voter_data_electionId_voterId_key";

-- AlterTable
ALTER TABLE "aggregated_results" DROP COLUMN "electionId";

-- AlterTable
ALTER TABLE "voter_data" DROP COLUMN "electionId";

-- DropTable
DROP TABLE "election_params";

-- DropTable
DROP TABLE "elections";

-- CreateTable
CREATE TABLE "system_params" (
    "id" SERIAL NOT NULL,
    "N" TEXT NOT NULL,
    "H" TEXT NOT NULL,
    "skA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_params_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_voterId_key" ON "voter_data"("voterId");

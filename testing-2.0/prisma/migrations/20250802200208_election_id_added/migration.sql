/*
  Warnings:

  - You are about to drop the `election_params` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `zk_proofs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `voter_data` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[voterId,electionId]` on the table `voter_data` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `electionId` to the `aggregated_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `electionId` to the `voter_data` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `voter_data` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "voter_data_voterId_key";

-- AlterTable
ALTER TABLE "aggregated_results" ADD COLUMN     "electionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "voter_data" ADD COLUMN     "electionId" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "password" TEXT,
ALTER COLUMN "ci" DROP NOT NULL,
ALTER COLUMN "auxi" DROP NOT NULL;

-- DropTable
DROP TABLE "election_params";

-- DropTable
DROP TABLE "verification_attempts";

-- DropTable
DROP TABLE "zk_proofs";

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_email_key" ON "voter_data"("email");

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_voterId_electionId_key" ON "voter_data"("voterId", "electionId");

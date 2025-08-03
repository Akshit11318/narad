/*
  Warnings:

  - A unique constraint covering the columns `[electionId]` on the table `aggregated_results` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "aggregated_results_electionId_key" ON "aggregated_results"("electionId");

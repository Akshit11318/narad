/*
  Warnings:

  - You are about to drop the column `aux` on the `aggregated_results` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "aggregated_results" DROP COLUMN "aux";

-- AlterTable
ALTER TABLE "system_params" ADD COLUMN     "aux" TEXT;

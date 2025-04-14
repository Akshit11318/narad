/*
  Warnings:

  - You are about to drop the column `aux` on the `system_params` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "aggregated_results" ADD COLUMN     "aux" TEXT;

-- AlterTable
ALTER TABLE "system_params" DROP COLUMN "aux";

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

-- CreateTable
CREATE TABLE "voter_data" (
    "id" SERIAL NOT NULL,
    "voterId" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "auxi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voter_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregated_results" (
    "id" SERIAL NOT NULL,
    "aux" TEXT,
    "result" TEXT NOT NULL,
    "decodedVotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aggregated_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_voterId_key" ON "voter_data"("voterId");

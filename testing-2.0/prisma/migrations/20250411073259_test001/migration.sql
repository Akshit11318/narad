-- CreateTable
CREATE TABLE "election_params" (
    "id" SERIAL NOT NULL,
    "N" TEXT NOT NULL,
    "H" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_params_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "electionParamsId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voter_data" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "ski" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "auxi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voter_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregated_results" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "aux" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "decodedVotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aggregated_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_electionId_voterId_key" ON "voter_data"("electionId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "aggregated_results_electionId_key" ON "aggregated_results"("electionId");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_electionParamsId_fkey" FOREIGN KEY ("electionParamsId") REFERENCES "election_params"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voter_data" ADD CONSTRAINT "voter_data_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

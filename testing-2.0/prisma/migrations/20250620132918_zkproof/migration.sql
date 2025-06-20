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

-- CreateTable
CREATE TABLE "zk_proofs" (
    "id" SERIAL NOT NULL,
    "verificationCode" VARCHAR(16) NOT NULL,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "zkProofData" TEXT NOT NULL,
    "publicVerificationPackage" TEXT NOT NULL,
    "commitments" TEXT,
    "challenges" TEXT,
    "responses" TEXT,
    "publicParameters" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastVerificationAt" TIMESTAMP(3),
    "proofVersion" TEXT NOT NULL DEFAULT '1.0',
    "wasmGenerated" BOOLEAN NOT NULL DEFAULT true,
    "securityLevel" INTEGER NOT NULL DEFAULT 2048,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zk_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_attempts" (
    "id" SERIAL NOT NULL,
    "verificationCode" VARCHAR(16) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "verificationDetails" TEXT,
    "verificationTime" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_params" (
    "id" SERIAL NOT NULL,
    "electionId" TEXT NOT NULL,
    "prime" TEXT NOT NULL,
    "generator" TEXT NOT NULL,
    "modulus" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_params_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voter_data_voterId_key" ON "voter_data"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "zk_proofs_verificationCode_key" ON "zk_proofs"("verificationCode");

-- CreateIndex
CREATE INDEX "zk_proofs_verificationCode_idx" ON "zk_proofs"("verificationCode");

-- CreateIndex
CREATE INDEX "zk_proofs_voterId_idx" ON "zk_proofs"("voterId");

-- CreateIndex
CREATE INDEX "zk_proofs_electionId_idx" ON "zk_proofs"("electionId");

-- CreateIndex
CREATE INDEX "zk_proofs_timestamp_idx" ON "zk_proofs"("timestamp");

-- CreateIndex
CREATE INDEX "verification_attempts_verificationCode_idx" ON "verification_attempts"("verificationCode");

-- CreateIndex
CREATE INDEX "verification_attempts_timestamp_idx" ON "verification_attempts"("timestamp");

-- CreateIndex
CREATE INDEX "verification_attempts_success_idx" ON "verification_attempts"("success");

-- CreateIndex
CREATE UNIQUE INDEX "election_params_electionId_key" ON "election_params"("electionId");

-- CreateIndex
CREATE INDEX "election_params_electionId_idx" ON "election_params"("electionId");

import path from "path";
import fs from "fs";
import prisma from "../prisma";
import { blockchainService } from "./blockchainService";

// Load native aggregator addon (libtommath-based C module)
const addonPaths = [
  path.resolve(__dirname, "..", "..", "aggregator", "build", "build", "Release", "aggregator.node"),
  path.resolve(__dirname, "..", "aggregator", "build", "build", "Release", "aggregator.node"),
  path.resolve(process.cwd(), "aggregator", "build", "build", "Release", "aggregator.node"),
];

let addon: any = null;
for (const p of addonPaths) {
  try {
    if (fs.existsSync(p)) {
      addon = require(p);
      console.log("[NARAD] Native aggregator (libtommath) loaded from", p);
      break;
    }
  } catch (err) { }
}

if (!addon) {
  console.error("[NARAD] FATAL: Native aggregator (libtommath) not found!");
}

const DB_BATCH = 50000;

export class AggregationService {

  /**
   * Step 1: Collector computes aux = product of all auxi values mod N^2
   * Batched to avoid OOM on large datasets (30M+ voters)
   */
  async computeAuxProduct(electionId: string): Promise<string> {
    const systemParams = await prisma.systemParams.findFirst({ orderBy: { createdAt: "desc" } });
    if (!systemParams) throw new Error("System parameters not found");

    const N = BigInt("0x" + systemParams.N);
    const N2 = N * N;

    let auxProduct = 1n;
    let totalCount = 0;
    let cursor = 0;

    console.log("[NARAD] Computing aux product in batches of", DB_BATCH);

    while (true) {
      const batch = await prisma.voterData.findMany({
        where: {
          electionId,
          id: { gt: cursor },
          NOT: { auxi: null },
        },
        select: { id: true, auxi: true },
        orderBy: { id: "asc" },
        take: DB_BATCH,
      });

      if (batch.length === 0) break;

      for (const voter of batch) {
        if (voter.auxi) {
          auxProduct = (auxProduct * BigInt("0x" + voter.auxi)) % N2;
        }
      }

      totalCount += batch.length;
      cursor = batch[batch.length - 1].id;

      if (totalCount % 500000 === 0 || batch.length < DB_BATCH) {
        console.log("[NARAD] Aux batch: processed", totalCount, "voters so far");
      }

      if (batch.length < DB_BATCH) break;
    }

    if (totalCount === 0) {
      throw new Error("No votes to aggregate");
    }

    const auxHex = auxProduct.toString(16);
    const existing = await prisma.aggregatedResult.findFirst({ where: { electionId } });
    if (existing) {
      await prisma.aggregatedResult.update({ where: { id: existing.id }, data: { aux: auxHex } });
    } else {
      await prisma.aggregatedResult.create({ data: { aux: auxHex, result: "", decodedVotes: "[]", electionId } });
    }

    console.log("[NARAD] Aux product computed for", totalCount, "voters");
    return auxHex;
  }

  /**
   * Step 2: Full aggregation using native libtommath C module
   * Batched DB reads to avoid OOM; native module processes incrementally.
   * - aggregator_init: computes N^2, skA mod N, skA^-1 mod N (libtommath mp_invmod)
   * - add_ciphertext_to_product: multiply ciphertexts mod N^2 (libtommath mp_mod_mul)
   * - aggregate_votes_from_running_product: P=product^skA, P'=P*aux^-1, L(P'), *skA^-1
   * - unpack_votes: 25-bit slot extraction
   */
  async aggregateVotes(electionId: string): Promise<{
    totalVotes: number;
    voteCounts: number[];
    rawResult: string;
  }> {
    // Get crypto params from SystemParams (source of truth for Paillier)
    const systemParams = await prisma.systemParams.findFirst({ orderBy: { createdAt: "desc" } });
    if (!systemParams) throw new Error("System parameters not found");

    const Nhex = systemParams.N;
    const Hhex = systemParams.H;
    const skAhex = systemParams.skA || systemParams.H;

    // Get election metadata from blockchain (for candidates, stage, etc)
    const election = await blockchainService.getElection(electionId);
    const totalCandidates = Number(election.data.totalCandidates);

    const aggResult = await prisma.aggregatedResult.findFirst({ where: { electionId } });
    const auxHex = aggResult?.aux || "1";

    if (!addon) {
      throw new Error("Native aggregator (libtommath) not available. Build: cd aggregator && cmake-js compile");
    }

    // === FULL NATIVE AGGREGATION USING LIBTOMMATH ===
    console.log("[NARAD] === Native libtommath aggregation ===");
    console.log("[NARAD] N:", Nhex.substring(0, 20), "... (" + Nhex.length + " hex chars)");
    console.log("[NARAD] H:", Hhex.substring(0, 20), "...");
    console.log("[NARAD] skA:", skAhex.substring(0, 20), "...");

    // Create BigInt objects from hex using libtommath
    const nBI = addon.createBigIntFromHex(Nhex);
    const hBI = addon.createBigIntFromHex(Hhex);
    const skABI = addon.createBigIntFromHex(skAhex);

    // Initialize aggregator: computes N^2, skA mod N, skA^-1 mod N
    // Uses libtommath mp_invmod for the modular inverse
    console.log("[NARAD] Initializing aggregator (libtommath mp_invmod)...");
    const initResult = addon.aggregatorInit(nBI, hBI, skABI);
    if (initResult !== 0) {
      throw new Error("Native aggregator init failed: " + initResult);
    }
    console.log("[NARAD] Aggregator initialized successfully");

    // Reset running product to 1
    addon.resetRunningProduct();

    // Batch-fetch ciphertexts and feed to native module incrementally
    console.log("[NARAD] Processing ciphertexts in batches of", DB_BATCH);
    let totalVotes = 0;
    let cursor = 0;

    while (true) {
      const batch = await prisma.voterData.findMany({
        where: {
          electionId,
          id: { gt: cursor },
          NOT: { ci: null },
        },
        select: { id: true, ci: true },
        orderBy: { id: "asc" },
        take: DB_BATCH,
      });

      if (batch.length === 0) break;

      for (const voter of batch) {
        if (voter.ci) {
          const ciBI = addon.createBigIntFromHex(voter.ci);
          const addResult = addon.addCiphertextToProduct(ciBI);
          if (addResult !== 0) {
            addon.aggregatorCleanup();
            throw new Error("Failed to add ciphertext " + totalVotes + ": " + addResult);
          }
          totalVotes++;
        }
      }

      cursor = batch[batch.length - 1].id;

      if (totalVotes % 500000 === 0 || batch.length < DB_BATCH) {
        console.log("[NARAD] libtommath: processed", totalVotes, "ciphertexts so far");
      }

      if (batch.length < DB_BATCH) break;
    }

    if (totalVotes === 0) {
      addon.aggregatorCleanup();
      throw new Error("No votes to aggregate");
    }

    console.log("[NARAD] Processed all", totalVotes, "ciphertexts. Starting decryption...");

    // Aggregate: full Paillier decryption using libtommath
    // 1. P = product^skA mod N^2        (mp_exptmod)
    // 2. P' = P * aux^-1 mod N^2        (mp_invmod + mp_mod_mul)
    // 3. L(P') = (P'-1)/N               (bigint_subtract + bigint_divide)
    // 4. sum = L * skA^-1 mod N          (mp_mod_mul)
    console.log("[NARAD] Aggregating: P=product^skA, P'=P*aux^-1, L(P'), sum=L*skA^-1...");
    const auxBI = addon.createBigIntFromHex(auxHex);
    const sumBI = addon.aggregateVotesFromRunningProduct(auxBI);

    if (typeof sumBI === "number") {
      addon.aggregatorCleanup();
      throw new Error("Native aggregation failed with error code: " + sumBI);
    }

    console.log("[NARAD] Aggregation complete, extracting results...");

    // Convert sum to hex string
    const rawResult = addon.bigIntToString(sumBI);

    // Unpack votes using native 25-bit extraction
    const voteCounts: number[] = addon.unpackVotes(sumBI, totalCandidates);
    if (typeof voteCounts === "number") {
      addon.aggregatorCleanup();
      throw new Error("Native unpackVotes failed: " + voteCounts);
    }

    // Cleanup libtommath resources
    addon.aggregatorCleanup();
    console.log("[NARAD] Native libtommath cleanup complete");
    console.log("[NARAD] Vote counts:", voteCounts);
    console.log("[NARAD] Total votes:", totalVotes);

    await this.storeResults(electionId, auxHex, rawResult, voteCounts, election, totalVotes);
    return { totalVotes, voteCounts, rawResult };
  }

  private async storeResults(
    electionId: string, auxHex: string, rawResult: string,
    voteCounts: number[], election: any, totalVotes: number
  ) {
    const decodedVotes = voteCounts.map((count, idx) => ({
      candidate: election.data.candidateWhitelist[idx] || ("Candidate " + (idx + 1)),
      votes: count,
    }));

    const aggResult = await prisma.aggregatedResult.findFirst({ where: { electionId } });
    if (aggResult) {
      await prisma.aggregatedResult.update({ where: { id: aggResult.id }, data: { result: rawResult, decodedVotes: JSON.stringify(decodedVotes) } });
    } else {
      await prisma.aggregatedResult.create({ data: { aux: auxHex, result: rawResult, decodedVotes: JSON.stringify(decodedVotes), electionId } });
    }

    try { await blockchainService.addAUXT(electionId, auxHex); }
    catch (err) { console.warn("[NARAD] Skipping AUXT sync:", err instanceof Error ? err.message : err); }
  }

  async getResults(electionId: string) {
    const result = await prisma.aggregatedResult.findFirst({ where: { electionId } });
    if (!result) return null;
    return { result: result.result, decodedVotes: JSON.parse(result.decodedVotes || "[]"), aux: result.aux };
  }
}

export const aggregationService = new AggregationService();

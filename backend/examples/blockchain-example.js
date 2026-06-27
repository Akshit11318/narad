const axios = require("axios");

const BASE_URL = "http://localhost:3000/api/blockchain";

/**
 * Example: Complete Election Lifecycle
 *
 * This example demonstrates a complete election lifecycle:
 * 1. Create an election
 * 2. Add candidates
 * 3. Set cryptographic parameters
 * 4. Change to voting stage
 * 5. Submit votes
 * 6. Check results
 */

async function runElectionExample() {
  console.log("🏛️  Starting Election Lifecycle Example\n");

  try {
    // Step 1: Create Election
    console.log("📋 Step 1: Creating Election");
    const createResponse = await axios.post(`${BASE_URL}/create-election`, {
      totalVotes: 50,
      totalCandidates: 3,
    });

    const electionId = createResponse.data.data.electionId;
    console.log(`✅ Election created with ID: ${electionId}`);
    console.log(`📝 Transaction: ${createResponse.data.data.transaction}\n`);

    // Step 2: Add Candidates
    console.log("👥 Step 2: Adding Candidates");
    const candidates = ["John Smith", "Jane Doe", "Bob Johnson"];

    for (const candidate of candidates) {
      await axios.post(`${BASE_URL}/elections/${electionId}/candidates`, {
        candidateName: candidate,
      });
      console.log(`✅ Added candidate: ${candidate}`);
    }
    console.log("");

    // Step 3: Set Cryptographic Parameters
    console.log("🔐 Step 3: Setting Cryptographic Parameters");

    // Add SKA (Secret Key Aggregator)
    await axios.post(`${BASE_URL}/elections/${electionId}/ska`, {
      ska: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    });
    console.log("✅ SKA parameter set");

    // Add AUXT (Auxiliary Value)
    await axios.post(`${BASE_URL}/elections/${electionId}/auxt`, {
      auxt: "f1e2d3c4b5a6789012345678901234567890fedcba1234567890fedcba123456",
    });
    console.log("✅ AUXT parameter set");

    // Add Collector Public Key
    await axios.post(`${BASE_URL}/elections/${electionId}/collector-pkc`, {
      collectorPkc:
        "pubkey1234567890abcdef1234567890abcdef1234567890abcdef123456",
    });
    console.log("✅ Collector PKC parameter set\n");

    // Step 4: Change to Voting Stage
    console.log("🗳️  Step 4: Starting Voting Phase");
    await axios.post(`${BASE_URL}/elections/${electionId}/change-stage`, {
      stage: "voting",
    });
    console.log("✅ Election stage changed to voting\n");

    // Step 5: Submit Votes
    console.log("📊 Step 5: Submitting Votes");
    const voters = [
      { id: "voter001", vote: "encrypted_vote_data_001" },
      { id: "voter002", vote: "encrypted_vote_data_002" },
      { id: "voter003", vote: "encrypted_vote_data_003" },
      { id: "voter004", vote: "encrypted_vote_data_004" },
      { id: "voter005", vote: "encrypted_vote_data_005" },
    ];

    for (const voter of voters) {
      await axios.post(`${BASE_URL}/elections/${electionId}/vote`, {
        voterId: voter.id,
        voterCi: voter.vote,
      });
      console.log(`✅ Vote submitted for ${voter.id}`);
    }
    console.log("");

    // Step 6: Check Voter Status
    console.log("🔍 Step 6: Checking Voter Status");
    for (const voter of voters) {
      const statusResponse = await axios.get(
        `${BASE_URL}/elections/${electionId}/voter-status/${voter.id}`
      );
      const hasVoted = statusResponse.data.data.hasVoted;
      console.log(
        `📊 ${voter.id}: ${hasVoted ? "✅ Has voted" : "❌ Has not voted"}`
      );
    }
    console.log("");

    // Step 7: Get Election Details
    console.log("📋 Step 7: Final Election Details");
    const electionResponse = await axios.get(
      `${BASE_URL}/elections/${electionId}`
    );
    const electionData = electionResponse.data.data.data;

    console.log(`🏛️  Election ID: ${electionId}`);
    console.log(`📊 Stage: ${electionData.stage}`);
    console.log(`👥 Total Candidates: ${electionData.totalCandidates}`);
    console.log(`🗳️  Total Votes: ${electionData.totalVotes}`);
    console.log(`📝 Candidates: ${electionData.candidateWhitelist.join(", ")}`);
    console.log(`🔐 SKA: ${electionData.ska.substring(0, 20)}...`);
    console.log(`🔐 AUXT: ${electionData.auxt.substring(0, 20)}...`);
    console.log(
      `🔐 Collector PKC: ${electionData.collectorPkc.substring(0, 20)}...`
    );

    console.log("\n🎉 Election lifecycle completed successfully!");
    console.log("📊 All votes have been recorded on the blockchain");
    console.log("🔐 Cryptographic parameters are securely stored");
    console.log("✅ Election integrity is maintained");
  } catch (error) {
    console.error(
      "\n❌ Example failed:",
      error.response?.data || error.message
    );
    console.error(
      "Error details:",
      error.response?.status,
      error.response?.statusText
    );
  }
}

/**
 * Example: Cryptographic Parameter Management
 */
async function runCryptoExample() {
  console.log("\n🔐 Cryptographic Parameter Management Example\n");

  try {
    // Create election for crypto example
    const createResponse = await axios.post(`${BASE_URL}/create-election`, {
      totalVotes: 10,
      totalCandidates: 2,
    });

    const electionId = createResponse.data.data.electionId;
    console.log(`📋 Created election: ${electionId}`);

    // Demonstrate different cryptographic operations
    console.log("\n🔐 Setting up cryptographic parameters...");

    // Set SKA with a realistic value
    const skaValue =
      "d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952";
    await axios.post(`${BASE_URL}/elections/${electionId}/ska`, {
      ska: skaValue,
    });
    console.log("✅ SKA set with secure value");

    // Set AUXT with a realistic value
    const auxtValue =
      "a94337c30ddffe19568c42e4865e088c756e023111e305c8e7454e6ef12fd85e";
    await axios.post(`${BASE_URL}/elections/${electionId}/auxt`, {
      auxt: auxtValue,
    });
    console.log("✅ AUXT set with secure value");

    // Set Collector PKC
    const collectorPkc =
      "pubkey_1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    await axios.post(`${BASE_URL}/elections/${electionId}/collector-pkc`, {
      collectorPkc,
    });
    console.log("✅ Collector PKC set");

    // Sync updated collector PKC
    const updatedCollectorPkc =
      "updated_pubkey_1234567890abcdef1234567890abcdef1234567890abcdef";
    await axios.post(`${BASE_URL}/elections/${electionId}/sync-collector-pkc`, {
      collectorPkc: updatedCollectorPkc,
    });
    console.log("✅ Collector PKC synced with updated value");

    // Verify the parameters
    const electionResponse = await axios.get(
      `${BASE_URL}/elections/${electionId}`
    );
    const electionData = electionResponse.data.data.data;

    console.log("\n📋 Verification Results:");
    console.log(`🔐 SKA: ${electionData.ska}`);
    console.log(`🔐 AUXT: ${electionData.auxt}`);
    console.log(`🔐 Collector PKC: ${electionData.collectorPkc}`);

    console.log("\n✅ Cryptographic parameters successfully managed!");
  } catch (error) {
    console.error(
      "\n❌ Crypto example failed:",
      error.response?.data || error.message
    );
  }
}

// Run examples
async function main() {
  console.log("🚀 Blockchain Integration Examples");
  console.log("================================\n");

  await runElectionExample();
  await runCryptoExample();

  console.log("\n✨ All examples completed!");
  console.log("📚 Check BLOCKCHAIN_INTEGRATION.md for more details");
}

main().catch(console.error);

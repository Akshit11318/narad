const axios = require("axios");

const BASE_URL = "http://localhost:3000/api/blockchain";

async function testBlockchainIntegration() {
  console.log("Testing Blockchain Integration...\n");

  try {
    // Test 1: Create an election
    console.log("1. Creating election...");
    const createResponse = await axios.post(`${BASE_URL}/create-election`, {
      totalVotes: 100,
      totalCandidates: 4,
    });

    console.log("✅ Election created successfully");
    console.log("Election ID:", createResponse.data.data.electionId);
    console.log("Transaction:", createResponse.data.data.transaction);

    const electionId = createResponse.data.data.electionId;

    // Test 2: Get all elections
    console.log("\n2. Fetching all elections...");
    const electionsResponse = await axios.get(`${BASE_URL}/elections`);
    console.log("✅ Elections fetched successfully");
    console.log("Number of elections:", electionsResponse.data.data.length);

    // Test 3: Get specific election
    console.log("\n3. Fetching specific election...");
    const electionResponse = await axios.get(
      `${BASE_URL}/elections/${electionId}`
    );
    console.log("✅ Election fetched successfully");
    console.log("Election stage:", electionResponse.data.data.data.stage);

    // Test 4: Add candidates
    console.log("\n4. Adding candidates...");
    const candidates = ["Alice", "Bob", "Charlie", "David"];

    for (const candidate of candidates) {
      await axios.post(`${BASE_URL}/elections/${electionId}/candidates`, {
        candidateName: candidate,
      });
      console.log(`✅ Added candidate: ${candidate}`);
    }

    // Test 5: Add SKA
    console.log("\n5. Adding SKA...");
    await axios.post(`${BASE_URL}/elections/${electionId}/ska`, {
      ska: "test-ska-value-12345",
    });
    console.log("✅ SKA added successfully");

    // Test 6: Add AUXT
    console.log("\n6. Adding AUXT...");
    await axios.post(`${BASE_URL}/elections/${electionId}/auxt`, {
      auxt: "test-auxt-value-67890",
    });
    console.log("✅ AUXT added successfully");

    // Test 7: Add collector PKC
    console.log("\n7. Adding collector PKC...");
    await axios.post(`${BASE_URL}/elections/${electionId}/collector-pkc`, {
      collectorPkc: "test-collector-pkc-abcdef",
    });
    console.log("✅ Collector PKC added successfully");

    // Test 8: Change election stage to voting
    console.log("\n8. Changing election stage to voting...");
    await axios.post(`${BASE_URL}/elections/${electionId}/change-stage`, {
      stage: "voting",
    });
    console.log("✅ Election stage changed to voting");

    // Test 9: Submit a vote
    console.log("\n9. Submitting a vote...");
    await axios.post(`${BASE_URL}/elections/${electionId}/vote`, {
      voterId: "voter123",
      voterCi: "encrypted-vote-data-xyz",
    });
    console.log("✅ Vote submitted successfully");

    // Test 10: Check voter status
    console.log("\n10. Checking voter status...");
    const voterStatusResponse = await axios.get(
      `${BASE_URL}/elections/${electionId}/voter-status/voter123`
    );
    console.log("✅ Voter status checked successfully");
    console.log("Has voted:", voterStatusResponse.data.data.hasVoted);

    // Test 11: Sync collector PKC
    console.log("\n11. Syncing collector PKC...");
    await axios.post(`${BASE_URL}/elections/${electionId}/sync-collector-pkc`, {
      collectorPkc: "updated-collector-pkc-ghijkl",
    });
    console.log("✅ Collector PKC synced successfully");

    console.log("\n🎉 All blockchain integration tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.response?.data || error.message);
    console.error(
      "Error details:",
      error.response?.status,
      error.response?.statusText
    );
  }
}

// Run the test
testBlockchainIntegration();

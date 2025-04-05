const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Define N value (from the provided n_bytes array)
const N = "FFFFFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437";

// Calculate N^2 (simple string doubling for representation - in a real system, use BigInt)
// This is a simplified calculation for demonstration
// In a real implementation, proper large number multiplication would be used
// N^2 = N * N
function calculateNSquared(n) {
    // Using BigInt for accurate calculation
    const nBigInt = BigInt('0x' + n);
    const nSquaredBigInt = nBigInt * nBigInt;
    return nSquaredBigInt.toString(16).toUpperCase();
}

const N_squared = calculateNSquared(N);

// Define H value as provided in H_CONST (converted to hex string)
// H_CONST: [0x0b, 0x54, 0xc4, 0x2d, 0x86, 0x12, 0x6e, 0x72, 0x3d, 0x9b, 0xf2, 0x83, 
//           0xae, 0x62, 0xf0, 0x5e, 0x88, 0x45, 0x1e, 0xa2, 0xbc, 0x66, 0x48, 0x37, 
//           0x3a, 0xd6, 0x8a, 0x0f, 0x1a, 0x8a, 0x06, 0xc1]
const H = "0B54C42D86126E723D9BF283AE62F05E88451EA2BC6648373AD68A0F1A8A06C1";

// Remove the random generation function and instead define precomputed auxiliary values
const predefinedAuxValues = [
    "7A5D8F3C1E6B2A9D4F8C7E5A1B3D6F9C2E5A8D4B7F1E3C5A9D2B6F8E4C7A3D5F9B",
    "18F5E2D9C7B6A4F3E2D1C9B8A7F6E5D4C3B2A1F9E8D7C6B5A4F3E2D1C9B8A7F6E5",
    "C1A7F3E9D5B8F2E6D4C8A3F7E2D9B5C1A6F4E8D3B7C2A9F5E1D6B3C8A4F7E2D9B5",
    "3F8E2D7C6B5A9F4E3D2C1B7A6F5E4D3C2B1A9F8E7D6C5B4A3F2E1D9C8B7A6F5E4D",
    "9B5C1A7F3E2D8B4C6A2F8E4D1C7B3A9F5E2D6B8C4A1F7E3D9B5C2A6F4E1D7B3C9A"
];

// Endpoint to fetch election parameters
app.get('/api/election/params', (req, res) => {
    // These values are mock parameters for testing
    // In a real system, they would be generated through a secure setup process
    const params = {
        N: N,
        N_squared: N_squared,
        H: H
    };

    console.log("GET /api/election/params - Sending election parameters");
    console.log(`N: ${N}`);
    console.log(`N_squared: ${N_squared}`);
    console.log(`H: ${H}`);
    res.json(params);
});

// Endpoint to fetch auxiliary values from voters
app.get('/api/auxiliary/values', (req, res) => {
    // Get the requested number of values (default to 3, max 5)
    let count = parseInt(req.query.count) || 3;
    count = Math.min(count, predefinedAuxValues.length);

    // Return the requested number of predefined auxiliary values
    const auxiliaryValues = [];
    for (let i = 0; i < count; i++) {
        auxiliaryValues.push({
            voter_id: `voter_${i+1}`,
            aux_value: predefinedAuxValues[i]
        });
    }

    console.log(`GET /api/auxiliary/values - Sending ${count} auxiliary values`);
    for (let i = 0; i < count; i++) {
        console.log(`Voter ${i+1}: ${auxiliaryValues[i].aux_value}`);
    }

    res.json({ values: auxiliaryValues });
});

// Endpoint to receive the final auxiliary value
app.post('/api/auxiliary/final', (req, res) => {
    const { final_aux } = req.body;

    console.log(`POST /api/auxiliary/final - Received final auxiliary value:`);
    console.log(`==========================================================`);
    console.log(`${final_aux}`);
    console.log(`==========================================================`);

    // Log auxiliary value length for verification
    console.log(`Length: ${final_aux ? final_aux.length / 2 : 0} bytes`);

    // Validate that the final_aux is a hex string
    if (!final_aux || !/^[0-9A-Fa-f]+$/.test(final_aux)) {
        console.log("ERROR: Invalid auxiliary value format");
        return res.status(400).json({ error: "Invalid auxiliary value format" });
    }

    // Respond with success
    res.json({
        success: true,
        message: "Final auxiliary value received successfully",
        timestamp: new Date().toISOString()
    });

    console.log("Response sent: Final auxiliary value accepted");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`Error processing request: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(port, () => {
    console.log(`Backend test server running at http://localhost:${port}`);
    console.log("Available endpoints:");
    console.log("  GET  /api/election/params");
    console.log("  GET  /api/auxiliary/values");
    console.log("  POST /api/auxiliary/final");
});
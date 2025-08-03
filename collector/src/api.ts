import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the API endpoint
const API_URL = "http://localhost:3000/api/collector";
const electionId = process.env.ELECTION_ID;

/**
 * Fetch N and H parameters from the backend
 * @returns Object containing N and H as hex strings
 */
export async function fetchNAndH(): Promise<{ N: string; H: string }> {
  try {
    console.log(`[*] Connecting to API at ${API_URL}/params`);
    const response = await axios.get(`${API_URL}/params`);
    console.log(`[*] Successfully fetched N and H parameters`);
    return {
      N: response.data.N,
      H: response.data.H,
    };
  } catch (error) {
    console.error(`[*] Error fetching N and H parameters:`, error);
    throw error;
  }
}

/**
 * Fetch auxiliary values from the backend
 * @returns Array of auxiliary value hex strings
 */
export async function fetchAuxiliaryValues(): Promise<string[]> {
  try {
    console.log(
      `[*] Fetching auxiliary values from ${API_URL}/fetch-auxiliary`
    );
    const response = await axios.get(
      `${API_URL}/fetch-auxiliary/${electionId}`,
      {
        validateStatus: function (status) {
          return status < 500; // Reject only if the status code is greater than or equal to 500
        },
      }
    );

    if (!response.data || !Array.isArray(response.data.auxiliaryValues)) {
      throw new Error(
        "Invalid response format: auxiliaryValues not found or not an array"
      );
    }

    // Extract the auxi values from the response
    const auxiliaryValues = response.data.auxiliaryValues.map(
      (value: { voterId: string; auxi: string }) => value.auxi
    );

    console.log(
      `[*] Successfully fetched ${auxiliaryValues.length} auxiliary values`
    );
    return auxiliaryValues;
  } catch (error) {
    console.error(`[*] Error fetching auxiliary values:`, error);
    throw error;
  }
}

/**
 * Submit the auxiliary product to the backend
 * @param product The product of auxiliary values as a hex string
 * @returns API response
 */
export async function submitAuxiliaryProduct(product: string): Promise<any> {
  try {
    const response = await axios.post(`${API_URL}/aux`, {
      electionId: electionId,
      aux: product,
    });
    console.log(`[*] Successfully submitted auxiliary product`);
    return response.data;
  } catch (error) {
    console.error(`[*] Error submitting auxiliary product:`, error);
    throw error;
  }
}

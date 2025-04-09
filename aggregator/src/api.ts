import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the API endpoint to fetch ciphertexts
const API_URL = process.env.API_URL || "http://localhost:3000";

/**
 * Fetch ciphertexts from the API
 * @returns Array of ciphertext hex strings
 */
export async function fetchCiphertexts(): Promise<string[]> {
  try {
    const response = await axios.get(`${API_URL}/ciphertexts`);
    return response.data.ciphertexts;
  } catch (error) {
    console.error("Error fetching ciphertexts:", error);
    throw error;
  }
}

/**
 * Fetch auxiliary value from the collector
 * @returns Auxiliary value hex string
 */
export async function fetchAuxiliaryValue(): Promise<string> {
  try {
    const response = await axios.get(`${API_URL}/auxiliary-value`);
    return response.data.auxiliaryValue;
  } catch (error) {
    console.error("Error fetching auxiliary value:", error);
    throw error;
  }
}

/**
 * Submit the aggregated result to the API
 * @param sum The aggregated vote sum as a string representation
 * @returns API response
 */
export async function submitAggregatedResult(sum: string): Promise<any> {
  try {
    const response = await axios.post(`${API_URL}/aggregated-result`, { sum });
    return response.data;
  } catch (error) {
    console.error("Error submitting aggregated result:", error);
    throw error;
  }
}

import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the API endpoint to fetch ciphertexts and params
const API_URL = "http://localhost:3000/api/aggregator";
const electionId = process.env.ELECTION_ID;
// Define the interface for election parameters
interface ElectionParams {
  N: string;
  H: string;
  skA: string;
}

// Define the interface for ciphertext data
interface CiphertextData {
  voterId: string;
  ci: string;
}

// Define the interface for the combined response
interface CiphertextsAndAuxResponse {
  ciphertexts: CiphertextData[];
  aux: string;
}

/**
 * Fetch election parameters from the API
 * @returns Object containing N, H, and Ska values
 */
export async function fetchElectionParams(): Promise<ElectionParams> {
  try {
    const response = await axios.get(`${API_URL}/params`);
    return response.data;
  } catch (error) {
    console.error("Error fetching election parameters:", error);
    throw error;
  }
}

// /**
//  * Fetch ciphertexts from the API
//  * @returns Array of ciphertext hex strings
//  */
// export async function fetchCiphertexts(): Promise<string[]> {
//   try {
//     const response = await axios.get(`${API_URL}/ciphertexts`);
//     return response.data.ciphertexts;
//   } catch (error) {
//     console.error("Error fetching ciphertexts:", error);
//     throw error;
//   }
// }

/**
 * Fetch both ciphertexts and auxiliary value in a single request
 * @returns Object containing ciphertexts array and auxiliary value
 */
export async function fetchCiphertextsAndAux(): Promise<CiphertextsAndAuxResponse> {
  try {
    const response = await axios.get(
      `${API_URL}/ciphertexts-and-aux/${electionId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ciphertexts and auxiliary value:", error);
    throw error;
  }
}

// /**
//  * Fetch auxiliary value from the collector
//  * @returns Auxiliary value hex string
//  */
// export async function fetchAuxiliaryValue(): Promise<string> {
//   try {
//     const response = await axios.get(`${API_URL}/auxiliary-value`);
//     return response.data.auxiliaryValue;
//   } catch (error) {
//     console.error("Error fetching auxiliary value:", error);
//     throw error;
//   }
// }

/**
 * Submit the aggregated result to the API
 * @param sum The aggregated vote sum as a string representation
 * @returns API response
 */
export async function submitAggregatedResult(sum: string): Promise<any> {
  try {
    const response = await axios.post(`${API_URL}/result`, {
      sum,
      electionId,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting aggregated result:", error);
    throw error;
  }
}

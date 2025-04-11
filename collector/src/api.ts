import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the API endpoint
const API_URL = process.env.API_URL || "http://localhost:3000";

/**
 * Fetch N and H parameters from the backend
 * @returns Object containing N and H as hex strings
 */
export async function fetchNAndH(): Promise<{ N: string; H: string }> {
  try {
    const response = await axios.get(`${API_URL}/election-params`);
    return {
      N: response.data.N,
      H: response.data.H,
    };
  } catch (error) {
    console.error("Error fetching N and H parameters:", error);
    throw error;
  }
}

/**
 * Fetch auxiliary values from the backend
 * @returns Array of auxiliary value hex strings
 */
export async function fetchAuxiliaryValues(): Promise<string[]> {
  try {
    const response = await axios.get(`${API_URL}/auxiliary-values`);
    return response.data.auxiliaryValues;
  } catch (error) {
    console.error("Error fetching auxiliary values:", error);
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
    const response = await axios.post(`${API_URL}/auxiliary-product`, {
      product,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting auxiliary product:", error);
    throw error;
  }
}

import type { Candidate } from "../types";

const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
};

/**
 * Fetches candidates from the backend API for a specific election
 * @param electionId The election ID to fetch candidates for
 * @returns Promise resolving to array of Candidate objects
 */
export async function fetchCandidatesFromAPI(
  electionId: string
): Promise<Candidate[]> {
  try {
    console.log(
      "🎯 CandidateGenerator: Fetching candidates for election:",
      electionId
    );

    const response = await fetch(
      `${getBackendUrl()}/api/blockchain/elections/${electionId}/candidates`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch candidates: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch candidates");
    }

    console.log(
      "✅ CandidateGenerator: Successfully fetched",
      result.data.length,
      "candidates"
    );
    return result.data;
  } catch (error) {
    console.error("❌ CandidateGenerator: Error fetching candidates:", error);
    throw error;
  }
}

/**
 * Validates if a candidate count is within acceptable limits
 * @param count Number of candidates
 * @returns boolean indicating if count is valid
 */
export function isValidCandidateCount(count: number): boolean {
  return count >= 1 && count <= 10; // Reasonable limits for voting
}

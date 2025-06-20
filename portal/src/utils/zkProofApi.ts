interface ZKProofSubmissionData {
  verificationCode: string;
  voterId: string;
  electionId: string;
  commitments: any;
  challenges: any;
  responses: any;
  publicParameters: any;
  proofVersion?: string;
}

interface VerificationRequestData {
  verificationCode: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

class ZKProofApiService {
  private baseUrl = '/api/zkproof';

  async submitProof(proofData: ZKProofSubmissionData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proofData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit proof');
      }

      return result;
    } catch (error) {
      console.error('Error submitting ZK proof:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async verifyProof(verificationData: VerificationRequestData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      return result;
    } catch (error) {
      console.error('Error verifying ZK proof:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getPublicVerificationData(verificationCode: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/public/${verificationCode}`);
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch verification data');
      }

      return result;
    } catch (error) {
      console.error('Error fetching public verification data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getElectionStats(electionId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/${electionId}`);
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch election stats');
      }

      return result;
    } catch (error) {
      console.error('Error fetching election stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const zkProofApi = new ZKProofApiService();

// Export types for use in components
export type { ZKProofSubmissionData, VerificationRequestData, ApiResponse };

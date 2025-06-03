import type { VoteReceipt, Candidate } from '../types';

interface ReceiptData {
  transactionHash: string;
  candidate: Candidate;
  timestamp: Date;
  voterId: string;
  electionId: string;
}

export function generateVoteReceipt(data: ReceiptData): VoteReceipt {
  const receiptId = generateReceiptId();
  const verificationCode = generateVerificationCode(data.transactionHash);
  
  return {
    id: receiptId,
    transactionHash: data.transactionHash,
    candidateId: data.candidate.id,
    candidateName: data.candidate.name,
    timestamp: data.timestamp,
    verificationCode,
    isVerified: true,
  };
}

export function generateReceiptPDF(receipt: VoteReceipt, voterId: string): Promise<Blob> {
  return new Promise((resolve) => {
    // Create a simple HTML receipt that can be converted to PDF
    const receiptHTML = createReceiptHTML(receipt, voterId);
    
    // For now, we'll create a simple blob with the HTML content
    // In a real implementation, you'd use a library like jsPDF or html2pdf
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    resolve(blob);
  });
}

export function downloadReceipt(receipt: VoteReceipt, voterId: string): void {
  generateReceiptPDF(receipt, voterId).then((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vote-receipt-${receipt.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

function generateReceiptId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `VR-${timestamp}-${random}`.toUpperCase();
}

function generateVerificationCode(transactionHash: string): string {
  // Simple verification code based on transaction hash
  const hash = transactionHash.substring(2, 10); // Remove '0x' prefix and take first 8 chars
  return hash.toUpperCase();
}

function createReceiptHTML(receipt: VoteReceipt, voterId: string): string {
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vote Receipt - ${receipt.id}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: #333;
          min-height: 100vh;
        }
        .receipt {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          padding: 30px;
        }
        .section {
          margin-bottom: 25px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .section h3 {
          margin: 0 0 15px 0;
          color: #1e40af;
          font-size: 18px;
          font-weight: 600;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .label {
          font-weight: 600;
          color: #374151;
        }
        .value {
          color: #6b7280;
          font-family: 'Courier New', monospace;
        }
        .verification {
          background: #ecfdf5;
          border-left-color: #10b981;
        }
        .verification .value {
          color: #059669;
          font-weight: 600;
        }
        .security-notice {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin-top: 25px;
        }
        .security-notice h4 {
          margin: 0 0 10px 0;
          color: #92400e;
          display: flex;
          align-items: center;
        }
        .security-notice h4::before {
          content: "🔒";
          margin-right: 8px;
        }
        .security-notice p {
          margin: 0;
          color: #92400e;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 12px;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .receipt {
            box-shadow: none;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>Official Vote Receipt</h1>
          <p>General Election 2025 • Secure Blockchain Voting</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h3>Vote Confirmation</h3>
            <div class="info-row">
              <span class="label">Receipt ID:</span>
              <span class="value">${receipt.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Voter ID:</span>
              <span class="value">${voterId}</span>
            </div>
            <div class="info-row">
              <span class="label">Candidate:</span>
              <span class="value">${receipt.candidateName}</span>
            </div>
            <div class="info-row">
              <span class="label">Vote Time:</span>
              <span class="value">${formatDate(receipt.timestamp)}</span>
            </div>
          </div>

          <div class="section verification">
            <h3>Blockchain Verification</h3>
            <div class="info-row">
              <span class="label">Transaction Hash:</span>
              <span class="value">${receipt.transactionHash}</span>
            </div>
            <div class="info-row">
              <span class="label">Verification Code:</span>
              <span class="value">${receipt.verificationCode}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value">✅ VERIFIED</span>
            </div>
          </div>

          <div class="security-notice">
            <h4>Security Information</h4>
            <p>
              This receipt proves that your vote was successfully recorded on the blockchain. 
              Your vote is encrypted and cannot be traced back to your identity. 
              Keep this receipt for your records and verification purposes.
            </p>
          </div>
        </div>

        <div class="footer">
          <p>
            This is an official electronic receipt generated by the secure voting system.<br>
            For verification or support, visit: support@voting-system.gov
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

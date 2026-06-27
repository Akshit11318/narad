#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════"
echo "         Solana Wallet & Validator Service"
echo "═══════════════════════════════════════════════════════════"

WALLET_PATH="/root/.config/solana/id.json"

# Generate wallet if not exists
if [ ! -f "$WALLET_PATH" ]; then
    echo "🔑 Generating new Solana wallet..."
    solana-keygen new --no-bip39-passphrase --force --outfile "$WALLET_PATH"
fi

# Display wallet info
echo ""
echo "📍 Wallet Public Key:"
solana-keygen pubkey "$WALLET_PATH"
echo ""

# Set config to local validator
solana config set --url http://solana-test-validator:8899

# Wait for validator to be ready
echo "⏳ Waiting for Solana validator..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if solana cluster-version 2>/dev/null; then
        echo "✅ Validator is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

# Airdrop SOL to wallet
echo ""
echo "💰 Airdropping SOL to wallet..."
solana airdrop 100

# Show balance
echo ""
echo "💼 Current Balance:"
solana balance

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Wallet ready! Use 'docker exec -it solana-wallet bash' to interact"
echo "═══════════════════════════════════════════════════════════"

# Keep container running and allow interaction
tail -f /dev/null

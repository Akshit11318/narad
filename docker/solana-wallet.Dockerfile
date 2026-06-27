# Solana Wallet Service - Persistent wallet for transactions
FROM solanalabs/solana:2.0.24

WORKDIR /wallet

# Create wallet directory
RUN mkdir -p /root/.config/solana

# Initialize wallet on first run
RUN solana-keygen new --no-bip39-passphrase --force --outfile /root/.config/solana/id.json

# Airdrop some SOL on startup
COPY docker/solana-wallet-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8899 8900

ENTRYPOINT ["/entrypoint.sh"]

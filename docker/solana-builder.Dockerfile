# Solana Program Builder - Builds Solana BPF program in isolation
FROM solanalabs/solana:2.0.24 AS solana-builder

WORKDIR /app

# Install Rust and Anchor
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

RUN rustup default 1.78.0 && rustup target add bpf

# Install Anchor CLI
RUN cargo install anchor-cli --version 0.30.1 --locked

# Copy project files
COPY Cargo.toml Cargo.lock ./
COPY programs ./programs
COPY Anchor.toml ./

# Build the program
RUN anchor build

# The built program will be at /app/target/deploy/voting_sys.so

CMD ["sh", "-c", "mkdir -p /output && cp target/deploy/voting_sys.so target/idl/voting_sys.json /output/"]

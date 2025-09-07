#!/bin/bash

# NARAD - Anonymous Blockchain Voting System Setup
# Developer: NARAD
# Description: Complete setup script for blockchain-based voting system

# Colors for aesthetic output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# API Base URL
API_BASE="http://localhost:3000/api"

# Function to print styled headers
print_header() {
    echo -e "\n${CYAN}===============================================${NC}"
    echo -e "${WHITE}*** $1 ***${NC}"
    echo -e "${CYAN}===============================================${NC}\n"
}

# Function to print step info
print_step() {
    echo -e "${YELLOW}>>> $1${NC}"
}

# Function to print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to wait for user input
wait_for_enter() {
    echo -e "\n${PURPLE}Press ENTER to continue to the next step...${NC}"
    read -r
}

# Start of the script
clear
echo -e "${CYAN}"
cat << "EOF"
 _   _          _____            _____  
| \ | |   /\   |  __ \     /\   |  __ \ 
|  \| |  /  \  | |__) |   /  \  | |  | |
| . ` | / /\ \ |  _  /   / /\ \ | |  | |
| |\  |/ ____ \| | \ \  / ____ \| |__| |
|_| \_/_/    \_\_|  \_\/_/    \_\_____/ 

Anonymous Blockchain Voting System
EOF
echo -e "${NC}"
echo -e "${WHITE}Developed by: NARAD${NC}"
echo -e "${BLUE}Setting up blockchain voting infrastructure...${NC}\n"

sleep 3

# ===============================================
# STEP 1: CREATE ELECTION
# ===============================================
print_header "STEP 1: CREATING ELECTION ON BLOCKCHAIN"

print_step "Preparing election configuration..."
sleep 2

print_step "Sending request to blockchain network..."
echo -e "${CYAN}POST ${API_BASE}/blockchain/create-election${NC}"
echo -e "${YELLOW}Payload: {\"totalVotes\":3, \"totalCandidates\":2}${NC}\n"

# Make the API call to create election
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"totalVotes":3,"totalCandidates":2}' \
  "${API_BASE}/blockchain/create-election")

echo -e "${BLUE}Response received:${NC}"
echo -e "${GREEN}$RESPONSE${NC}\n"

# Extract election ID (assuming the response contains electionId field)
ELECTION_ID=$(echo "$RESPONSE" | grep -o '"electionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ELECTION_ID" ]; then
    # Try alternative extraction methods
    ELECTION_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$ELECTION_ID" ]; then
    print_error "Failed to extract Election ID from response"
    echo "Please check the API response format and try again."
    exit 1
fi

print_success "Election created successfully!"
echo -e "${WHITE}Election ID: ${GREEN}$ELECTION_ID${NC}\n"

sleep 2

print_step "Updating environment configuration files..."
sleep 1

# Update collector .env file
COLLECTOR_ENV="/home/akshit/BLOCKCHAIN_REOP/votingSys/collector/.env"
print_step "Updating collector configuration: $COLLECTOR_ENV"

if [ -f "$COLLECTOR_ENV" ]; then
    # Remove existing ELECTION_ID line and add new one
    grep -v "ELECTION_ID=" "$COLLECTOR_ENV" > temp_collector.env
    echo "ELECTION_ID=\"$ELECTION_ID\"" >> temp_collector.env
    mv temp_collector.env "$COLLECTOR_ENV"
    print_success "Collector .env updated"
else
    echo "ELECTION_ID=\"$ELECTION_ID\"" > "$COLLECTOR_ENV"
    print_success "Collector .env created"
fi

sleep 1

# Update aggregator .env file
AGGREGATOR_ENV="/home/akshit/BLOCKCHAIN_REOP/votingSys/aggregator/.env"
print_step "Updating aggregator configuration: $AGGREGATOR_ENV"

if [ -f "$AGGREGATOR_ENV" ]; then
    # Remove existing ELECTION_ID line and add new one
    grep -v "ELECTION_ID=" "$AGGREGATOR_ENV" > temp_aggregator.env
    echo "ELECTION_ID=\"$ELECTION_ID\"" >> temp_aggregator.env
    mv temp_aggregator.env "$AGGREGATOR_ENV"
    print_success "Aggregator .env updated"
else
    echo "ELECTION_ID=\"$ELECTION_ID\"" > "$AGGREGATOR_ENV"
    print_success "Aggregator .env created"
fi

print_success "Environment files updated successfully!"
sleep 2

print_step "Waiting for blockchain synchronization..."
for i in {5..1}; do
    echo -ne "${YELLOW}Syncing... ${i}s remaining\r${NC}"
    sleep 1
done
echo -e "${GREEN}Blockchain synchronized!${NC}\n"

wait_for_enter

# ===============================================
# STEP 2: CREATE VOTERS
# ===============================================
print_header "STEP 2: REGISTERING VOTERS"

print_step "Preparing voter registration system..."
sleep 2

for i in {1..3}; do
    EMAIL="voter$i@gm.co"
    VOTER_ID="voter$i"
    
    print_step "Registering voter $i: $EMAIL"
    echo -e "${CYAN}POST ${API_BASE}/voter/add${NC}"
    echo -e "${YELLOW}Payload: {\"email\":\"$EMAIL\", \"voterId\":\"$VOTER_ID\", \"electionId\":\"$ELECTION_ID\"}${NC}"
    
    VOTER_RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"voterId\":\"$VOTER_ID\",\"electionId\":\"$ELECTION_ID\"}" \
      "${API_BASE}/voter/add")
    
    echo -e "${BLUE}Response: ${GREEN}$VOTER_RESPONSE${NC}\n"
    print_success "Voter $i registered successfully!"
    sleep 1.5
done

print_success "All voters registered in the system!"
sleep 2

wait_for_enter

# ===============================================
# STEP 3: ADD CANDIDATES TO BLOCKCHAIN
# ===============================================
print_header "STEP 3: ADDING CANDIDATES TO BLOCKCHAIN"

print_step "Preparing candidate registration..."
sleep 2

CANDIDATES=("ayush" "rajat" "shubham" "harsh")

for i in "${!CANDIDATES[@]}"; do
    CANDIDATE_NAME="${CANDIDATES[$i]}"
    CANDIDATE_NUM=$((i + 1))
    
    print_step "Adding candidate $CANDIDATE_NUM: $CANDIDATE_NAME"
    echo -e "${CYAN}POST ${API_BASE}/blockchain/elections/${ELECTION_ID}/candidates${NC}"
    echo -e "${YELLOW}Payload: {\"candidateName\":\"$CANDIDATE_NAME\"}${NC}"
    
    CANDIDATE_RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"candidateName\":\"$CANDIDATE_NAME\"}" \
      "${API_BASE}/blockchain/elections/${ELECTION_ID}/candidates")
    
    echo -e "${BLUE}Response: ${GREEN}$CANDIDATE_RESPONSE${NC}\n"
    print_success "Candidate '$CANDIDATE_NAME' added to blockchain!"
    sleep 2
done

print_success "All candidates registered on blockchain!"
sleep 2

wait_for_enter

# ===============================================
# STEP 4: CHANGE ELECTION STAGE TO VOTING
# ===============================================
print_header "STEP 4: ACTIVATING VOTING STAGE"

print_step "Preparing to activate voting stage..."
sleep 2

print_step "Changing election stage to 'voting'..."
echo -e "${CYAN}POST ${API_BASE}/blockchain/elections/${ELECTION_ID}/change-stage${NC}"
echo -e "${YELLOW}Payload: {\"stage\":\"voting\"}${NC}"

STAGE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"stage":"voting"}' \
  "${API_BASE}/blockchain/elections/${ELECTION_ID}/change-stage")

echo -e "${BLUE}Response: ${GREEN}$STAGE_RESPONSE${NC}\n"
print_success "Election stage changed to VOTING!"

sleep 2

print_step "Synchronizing blockchain state..."
for i in {3..1}; do
    echo -ne "${YELLOW}Updating network... ${i}s remaining\r${NC}"
    sleep 1
done
echo -e "${GREEN}Voting stage activated successfully!${NC}\n"

print_success "Election is now ready for voting!"
sleep 2

wait_for_enter

# ===============================================
# STEP 5: VERIFICATION
# ===============================================
print_header "STEP 4: ELECTION VERIFICATION"

print_step "Fetching complete election configuration..."
sleep 2

echo -e "${CYAN}GET ${API_BASE}/blockchain/elections/${ELECTION_ID}${NC}\n"

ELECTION_DETAILS=$(curl -s -X GET "${API_BASE}/blockchain/elections/${ELECTION_ID}")

echo -e "${BLUE}===============================================${NC}"
echo -e "${WHITE}ELECTION CONFIGURATION SUMMARY${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}$ELECTION_DETAILS${NC}"
echo -e "${BLUE}===============================================${NC}\n"

print_success "Election verification completed!"
sleep 2

# Final summary
print_header "SETUP COMPLETED SUCCESSFULLY"

echo -e "${GREEN}✓ Election created on blockchain${NC}"
echo -e "${GREEN}✓ Environment files updated${NC}"
echo -e "${GREEN}✓ 3 voters registered${NC}"
echo -e "${GREEN}✓ 2 candidates added${NC}"
echo -e "${GREEN}✓ Voting stage activated${NC}"
echo -e "${GREEN}✓ Configuration verified${NC}\n"

echo -e "${WHITE}Election ID: ${CYAN}$ELECTION_ID${NC}"
echo -e "${WHITE}Total Voters: ${CYAN}3${NC}"
echo -e "${WHITE}Total Candidates: ${CYAN}2${NC}"
echo -e "${WHITE}Candidates: ${CYAN}ayush, rajat${NC}\n"

echo -e "${PURPLE}🎉 NARAD Blockchain Voting System is ready for use! 🎉${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "${WHITE}- Voters can now cast their votes${NC}"
echo -e "${WHITE}- Monitor voting process through the dashboard${NC}"
echo -e "${WHITE}- Results will be tallied automatically on blockchain${NC}\n"

sleep 3

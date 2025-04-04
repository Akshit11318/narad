use anchor_lang::prelude::*;
use num_bigint::{BigUint, RandBigInt};
// use num_traits::Num;
use rand::thread_rng;
declare_id!("izmYTzv6KBxCLTjcPqVgJGbrkAz82oTX5tsyKu6CDwQ");

#[program]
pub mod voting_sys {
    use super::*;

    pub fn create_election(ctx: Context<CreateElection>, total_votes: u64, total_candidates: u64) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        
        election.stage = ElectionStage::Application;
        election.initiator = ctx.accounts.signer.key();
        election.total_votes = total_votes;
        election.total_candidates = total_candidates;
        // election.voter_whitelist = Vec::new();
        election.candidate_whitelist = Vec::new();
        // // === 1. Generate N = p * q ===
        // let mut rng = thread_rng();
        // let p: BigUint = rng.gen_prime(256);
        // let q: BigUint = rng.gen_prime(256);
        
        // Using a pre-computed  N value
        //  115792089237316195423570985008687907853269984665640564039457584007913129639991
        let n_bytes: [u8; 64] = [
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC9, 0x0F, 0xDA, 0xA2, 0x21, 0x68, 0xC2, 0x34,
            0xC4, 0xC6, 0x62, 0x8B, 0x80, 0xDC, 0x1C, 0xD1, 0x29, 0x02, 0x4E, 0x08, 0x8A, 0x67, 0xCC, 0x74,
            0x02, 0x0B, 0xBE, 0xA6, 0x3B, 0x13, 0x9B, 0x22, 0x51, 0x4A, 0x08, 0x79, 0x8E, 0x34, 0x04, 0xDD,
            0xEF, 0x95, 0x19, 0xB3, 0xCD, 0x3A, 0x43, 0x1B, 0x30, 0x2B, 0x0A, 0x6D, 0xF2, 0x5F, 0x14, 0x37
        ];

        let n = BigUint::from_bytes_be(&n_bytes);
        let n_squared = &n * &n;
        election.n = n_bytes.to_vec();

        // === 2. Hash the constant seed ===
        let h_raw_bytes = H_CONST;

        // === 3. Convert hash to BigUint and ensure it's coprime to n² ===
        let h_biguint = BigUint::from_bytes_be(&h_raw_bytes);
        let mut h_mod_n2 = h_biguint % &n_squared;
        
        // Keep incrementing h until we find a coprime value
        while h_mod_n2.gcd(&n_squared) != BigUint::from(1u32) {
            h_mod_n2 += BigUint::from(1u32);
            h_mod_n2 = h_mod_n2 % &n_squared;
        }

        // === 5. Store coprime h ===
        election.h = h_mod_n2.to_bytes_be();

        // Generate random SKA in Zn²* (numbers coprime to n²)
        let mut rng = thread_rng();
        let zero = BigUint::from(0u32);
        loop {
            let ska_candidate = rng.gen_biguint_range(&zero, &n_squared);
            // Check if ska is coprime with n² using GCD
            if ska_candidate.gcd(&n_squared) == BigUint::from(1u32) {
                election.ska = ska_candidate.to_bytes_be();
                break;
            }
        }
        
        Ok(())
    }

    pub fn change_stage(ctx: Context<ChangeStage>, new_stage: ElectionStage) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        election.stage = new_stage;
        Ok(())
    }

    // pub fn add_to_voter_whitelist(ctx: Context<ModifyWhitelist>, voter_id: String) -> Result<()> {
    //     let election = &mut ctx.accounts.election_data;
    //     require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
    //     require!(!election.voter_whitelist.contains(&voter_id), VotingError::AlreadyWhitelisted);
    //     election.voter_whitelist.push(voter_id);
    //     Ok(())
    // }

    // pub fn remove_from_voter_whitelist(ctx: Context<ModifyWhitelist>, voter_id: String) -> Result<()> {
    //     let election = &mut ctx.accounts.election_data;
    //     require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
    //     if let Some(index) = election.voter_whitelist.iter().position(|id| id == &voter_id) {
    //         election.voter_whitelist.remove(index);
    //     } else {
    //         return Err(VotingError::NotWhitelisted.into());
    //     }
    //     Ok(())
    // }

    pub fn add_to_candidate_whitelist(ctx: Context<ModifyWhitelist>, candidate_name: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
        require!(!election.candidate_whitelist.contains(&candidate_name), VotingError::AlreadyWhitelisted);
        election.candidate_whitelist.push(candidate_name);
        Ok(())
    }

    pub fn remove_from_candidate_whitelist(ctx: Context<ModifyWhitelist>, candidate_name: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
        if let Some(index) = election.candidate_whitelist.iter().position(|name| name == &candidate_name) {
            election.candidate_whitelist.remove(index);
        } else {
            return Err(VotingError::NotWhitelisted.into());
        }
        Ok(())
    }

    

    pub fn vote(ctx: Context<Vote>, voter_id: String,voter_ci: Vec<u8>) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        let voter = &mut ctx.accounts.voter_data;
        // TODO implement slot paking
        

        require!(election.stage == ElectionStage::Voting, VotingError::InvalidStage);
        // require!(election.voter_whitelist.contains(&voter_id), VotingError::NotWhitelisted);
        require!(voter.voted == false, VotingError::AlreadyVoted);

        

        Ok(())
    }

    pub fn sync_collector_pkc(ctx: Context<SyncCollectorPkc>, collector_pkc: Vec<u8>) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        election.collector_pkc = collector_pkc;
        Ok(()) 
    }
}
pub const H_CONST: [u8; 32] = [
    0x0b, 0x54, 0xc4, 0x2d, 0x86, 0x12, 0x6e, 0x72,
    0x3d, 0x9b, 0xf2, 0x83, 0xae, 0x62, 0xf0, 0x5e,
    0x88, 0x45, 0x1e, 0xa2, 0xbc, 0x66, 0x48, 0x37,
    0x3a, 0xd6, 0x8a, 0x0f, 0x1a, 0x8a, 0x06, 0xc1
];
#[derive(Accounts)]
#[instruction(total_votes: u64, total_candidates: u64)]  // Changed from usize to u64
pub struct CreateElection<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 1 + 32 + 8 + (4 + 32 * total_candidates as usize) + 64 + 32 + 128 + 128,
    )]
    pub election_data: Account<'info, ElectionData>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ChangeStage<'info> {
    #[account(mut, has_one = initiator)]
    pub election_data: Account<'info, ElectionData>,
    pub initiator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ModifyWhitelist<'info> {
    #[account(mut, has_one = initiator)]
    pub election_data: Account<'info, ElectionData>,
    pub initiator: Signer<'info>,
}



#[derive(Accounts)]
#[instruction(voter_id: String, candidate_name: String)]
pub struct Vote<'info> {
    #[account(mut)]
    pub election_data: Account<'info, ElectionData>,
    #[account(
        init,
        payer = signer,
        space = 8 + VoterData::MAX_SIZE,
        seeds = [b"voter", election_data.key().as_ref(), voter_id.as_bytes()],
        bump
    )]
    pub voter_data: Account<'info, VoterData>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SyncCollectorPkc<'info> {
    #[account(mut, has_one = initiator)]
    pub election_data: Account<'info, ElectionData>,
    pub initiator: Signer<'info>,
}


#[account]
pub struct ElectionData {
    pub stage: ElectionStage,
    pub initiator: Pubkey,
    pub total_votes: u64,
    pub total_candidates: u64,
    
    pub candidate_whitelist: Vec<String>,
    pub n: Vec<u8>,
    pub h: Vec<u8>,
    pub ska: Vec<u8>,
    pub collector_pkc: Vec<u8>,
}

#[account]
pub struct VoterData {
    pub voted: bool,
}

impl VoterData {
    pub const MAX_SIZE: usize = 1; // voted (1 byte)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ElectionStage {
    Application,
    Voting,
    Closed,
}

#[error_code]
pub enum VotingError {
    #[msg("Candidate name is too long.")]
    NameTooLong,
    #[msg("Invalid election stage for this action.")]
    InvalidStage,
    #[msg("You have already voted.")]
    AlreadyVoted,
    #[msg("Voter is not whitelisted.")]
    NotWhitelisted,
    #[msg("Voter is already whitelisted.")]
    AlreadyWhitelisted,
}


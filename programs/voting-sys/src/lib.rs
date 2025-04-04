use anchor_lang::prelude::*;
use num_bigint::{BigUint, RandBigInt};
use num_traits::Num;
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
        // === 1. Generate N = p * q ===
        let mut rng = thread_rng();
        let p: BigUint = rng.gen_prime(256);
        let q: BigUint = rng.gen_prime(256);
        let n = &p * &q;
        let n_squared = &n * &n;
        election.n = n.to_bytes_be();

        // === 2. Hash the constant seed ===
        let h_raw_bytes = H_CONST;

        // === 3. Convert hash to BigUint ===
        let h_biguint = BigUint::from_bytes_be(&h_raw_bytes);

        // === 4. Reduce mod N^2 ===
        let h_mod_n2 = h_biguint % &n_squared;

        // === 5. Store as bytes ===
        election.h = h_mod_n2.to_bytes_be();
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

    

    pub fn vote(ctx: Context<Vote>, voter_id: String, candidate_name: String) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate_data;
        let election = &mut ctx.accounts.election_data;
        let voter = &mut ctx.accounts.voter_data;

        require!(election.stage == ElectionStage::Voting, VotingError::InvalidStage);
        // require!(election.voter_whitelist.contains(&voter_id), VotingError::NotWhitelisted);
        require!(voter.voted == false, VotingError::AlreadyVoted);

        candidate.votes += 1;
        voter.voted = true;

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
        space = 8 + 1 + 32 + 8 + (4 + 32 * total_candidates as usize) + 64 + 32,
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
    #[account(
        mut,
        seeds = [b"candidate", election_data.key().as_ref(), candidate_name.as_bytes()],
        bump
    )]
    pub candidate_data: Account<'info, CandidateData>,
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

#[account]
pub struct ElectionData {
    pub stage: ElectionStage,
    pub initiator: Pubkey,
    pub total_votes: u64,
    pub total_candidates: u64,
    
    pub candidate_whitelist: Vec<String>,
    pub n: Vec<u8>,
    pub h: Vec<u8>,
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


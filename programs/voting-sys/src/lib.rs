use anchor_lang::prelude::*;


declare_id!("GuhBQikgkW5Pu6NLLVe6Xezh5iJjxr9YDdu4NzhnxM4m");

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
        election.n = String::from("a94337c30ddffe19568c42e4865e088c756e023111e305c8e7454e6ef12fd85e99c68e306cd6a6945e78915d1aba494ae575fa174a82abd4c2c7c66dd2982a6a");
        election.h = String::from("d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952f23f4504700b5eeec7186bc6dec990db64b9ea1eadce566e21b6f8429565cc0");
        election.ska = String::from("d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952f23f4504700b5eeec7186bc6dec990db64b9ea1eadce566e21b6f8429565cc0");
        election.collector_pkc = String::from("0");
        election.auxt = String::from("0");

        Ok(())
    }

    pub fn change_stage(ctx: Context<ChangeStage>, new_stage: ElectionStage) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        election.stage = new_stage;
        Ok(())
    }
    pub fn addska(ctx: Context<ChangeStage>, ska: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
        election.ska = ska;
        Ok(())
    }
    pub fn addauxt(ctx: Context<ChangeStage>, auxt: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
        election.auxt = auxt;
        Ok(())
    }
    pub fn addcollectorpkc(ctx: Context<ChangeStage>, collector_pkc: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        require!(election.stage == ElectionStage::Application, VotingError::InvalidStage);
        election.collector_pkc = collector_pkc;
        Ok(())
    }
    

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

    

    pub fn vote(ctx: Context<Vote>, voter_id: String, voter_ci: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        let voter = &mut ctx.accounts.voter_data;
        // TODO implement slot paking
        

        require!(election.stage == ElectionStage::Voting, VotingError::InvalidStage);
        // require!(election.voter_whitelist.contains(&voter_id), VotingError::NotWhitelisted);
        require!(voter.voted == false, VotingError::AlreadyVoted);

        voter.cyphertext = voter_ci;
        voter.voted = true;
        Ok(())
    }

    pub fn sync_collector_pkc(ctx: Context<SyncCollectorPkc>, collector_pkc: String) -> Result<()> {
        let election = &mut ctx.accounts.election_data;
        election.collector_pkc = collector_pkc;
        Ok(()) 
    }
}

#[derive(Accounts)]
#[instruction(total_votes: u64, total_candidates: u64)]  // Changed from usize to u64
pub struct CreateElection<'info> {
    #[account(
        init,
        payer = signer,
        // space = 8 + 1 + 32 + 8 + (4 + 32 * total_candidates as usize) + 64*5,
        space = 8 + 1 + 32 + 8 + 8 + 4 + (total_candidates as usize) * (4 + 32)+ 5 * (4 + 128)
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
#[instruction(voter_id: String)]
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
    pub n: String,
    pub h: String,
    pub ska: String,
    pub collector_pkc: String,
    pub auxt: String,
}

#[account]
pub struct VoterData {
    pub voted: bool,
    pub cyphertext: String,
}

impl VoterData {
    pub const MAX_SIZE: usize = 1+256+4; // voted (1 byte)
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


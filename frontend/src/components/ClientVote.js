import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { initCryptoParams, generateSecretKey, encryptVotePaillier } from '../wasm/wasmModule';

const ClientVote = () => {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [electionParams, setElectionParams] = useState({ n: null, h: null });
    const navigate = useNavigate();
    const { electionId } = useParams();
    const [account, setAccount] = useState('');

    useEffect(() => {
        // Fetch the account address
        const fetchAccount = async() => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/account`);
                setAccount(response.data.account);
            } catch (error) {
                console.error("Error fetching account:", error);
                toast.error("Failed to fetch account. Please try again.");
            }
        };

        fetchAccount();

        // Initialize cryptographic parameters for the election
        setupElection();
    }, []);

    // Initialize the cryptographic parameters for the election
    async function setupElection() {
        try {
            // Initialize with default parameters
            const { n, h } = await initCryptoParams();
            console.log("Crypto parameters initialized successfully");

            // Store these values in the component state
            setElectionParams({ n, h });

            // Generate keys and continue with the application setup
            const result = await generateSecretKey(n);
            if (result < 0) {
                console.error("Failed to generate secret key");
            }
        } catch (error) {
            console.error("Error setting up election:", error);
            toast.error("Failed to initialize encryption. Please try again.");
        }
    }

    const handleSubmitVote = async() => {
        try {
            // Use the cryptographic parameters for encryption
            const { n, h } = electionParams;
            if (!n || !h) {
                throw new Error("Cryptographic parameters not initialized");
            }

            // Encrypt each vote with the cryptographic parameters
            const encryptedVotes = [];
            for (const vote of selectedOptions) {
                const voteArray = new Uint8Array([vote]); // Convert vote to array format
                const encryptedVote = await encryptVotePaillier(voteArray, h, n);
                encryptedVotes.push(Array.from(encryptedVote)); // Convert to regular array for JSON
            }

            const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/votes/cast`, {
                electionId,
                voterAddress: account,
                encryptedVotes,
            });

            if (response.status === 200) {
                toast.success("Vote submitted successfully!");
                navigate(`/election/${electionId}/results`);
            } else {
                toast.error("Failed to submit vote. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting vote:", error);
            toast.error("Failed to submit vote. Please try again.");
        }
    };

    return ( <
        div >
        <
        h1 > Vote < /h1> { /* Render voting options */ } <
        button onClick = { handleSubmitVote } > Submit Vote < /button> <
        /div>
    );
};

export default ClientVote;
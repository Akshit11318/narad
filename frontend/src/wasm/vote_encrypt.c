#include "vote_encrypt.h"
#include "bigint_ops.h"
#include <string.h>
#include <stdlib.h>

/**
 * @brief Pack an array of votes into a single BigInt, with each vote occupying 25 bits
 * @param votes Array of votes to pack
 * @param vote_count Number of votes in the array (max 20)
 * @return A BigInt containing the packed votes
 */
BigInt pack_votes(const uint32_t* votes, size_t vote_count) {
    if (!votes || vote_count > 20) {
        // Return empty BigInt for invalid inputs
        uint8_t zero = 0;
        return create_bigint(&zero, 1);
    }
    
    // Calculate how many bytes we need for the result
    // Each vote takes 25 bits, so 20 votes would need 20*25 = 500 bits = 63 bytes
    const size_t MAX_RESULT_BYTES = 63;
    uint8_t* result_bytes = (uint8_t*)calloc(MAX_RESULT_BYTES, 1);
    
    if (!result_bytes) {
        // Memory allocation failed
        uint8_t zero = 0;
        return create_bigint(&zero, 1);
    }
    
    // The maximum value that can fit in 25 bits
    const uint32_t MAX_VOTE_VALUE = (1 << 25) - 1;
    
    // Pack each vote into the result, starting from the least significant bits
    // For an array like [0,0,1], the result will be:
    // 0(25 bits) | 0(25 bits) | 1(25 bits)
    for (size_t i = 0; i < vote_count; i++) {
        uint32_t vote = votes[i];
        
        // Ensure vote fits in 25 bits
        if (vote > MAX_VOTE_VALUE) {
            free(result_bytes);
            uint8_t zero = 0;
            return create_bigint(&zero, 1);
        }
        
        // Place the vote in the result bytes
        // We're placing votes from LSB to MSB, so vote_count-1-i puts the first vote in the array
        // at the least significant position
        size_t vote_bit_position = (vote_count - 1 - i) * 25;
        
        for (size_t bit = 0; bit < 25; bit++) {
            if ((vote >> bit) & 1) {
                size_t result_bit_pos = vote_bit_position + bit;
                size_t result_byte = result_bit_pos / 8;
                size_t result_bit = result_bit_pos % 8;

                if (result_byte < MAX_RESULT_BYTES) {
                    result_bytes[result_byte] |= (1 << result_bit);
                }
            }
        }
    }
    
    // Calculate actual used length 
    size_t used_bytes = (vote_count * 25 + 7) / 8; // Round up to the nearest byte
    
    // Remove leading zeros
    while (used_bytes > 1 && result_bytes[used_bytes - 1] == 0) {
        used_bytes--;
    }
    
    // Create BigInt from the packed bytes
    BigInt result = create_bigint(result_bytes, used_bytes);
    
    free(result_bytes);
    
    return result;
}

/**
 * @brief Pack and encrypt votes
 * @param votes Array of votes to pack and encrypt
 * @param vote_count Number of votes in the array (max 20)
 * @param n_data Public key n component
 * @param n_length Length of n_data
 * @param h_data Public key h component
 * @param h_length Length of h_data
 * @param ska_data Secret random key
 * @param ska_length Length of ska_data
 * @param result Buffer to store the encrypted result
 * @param result_length Length of the result buffer
 * @return 0 on success, negative value on error
 */
int pack_and_encrypt_votes(const uint32_t* votes, size_t vote_count,
                           const uint8_t* n_data, size_t n_length,
                           const uint8_t* h_data, size_t h_length,
                           const uint8_t* ska_data, size_t ska_length,
                           uint8_t* result, size_t result_length) {
    // Step 1: Pack the votes into a single BigInt
    BigInt packed_votes = pack_votes(votes, vote_count);
    
    // Step 2: If packing failed, return error
    if (packed_votes.length == 1 && packed_votes.data[0] == 0) {
        free_bigint(&packed_votes);
        return -1;
    }
    
    // Step 3: Encrypt the packed votes
    extern int encrypt_vote(const uint8_t*, size_t, const uint8_t*, size_t, 
                            const uint8_t*, size_t, const uint8_t*, size_t, 
                            uint8_t*, size_t);
    
    int encrypt_result = encrypt_vote(
        packed_votes.data, packed_votes.length,
        n_data, n_length,
        h_data, h_length,
        ska_data, ska_length,
        result, result_length
    );
    
    // Clean up
    free_bigint(&packed_votes);
    
    return encrypt_result;
}

// Global storage for encrypted vote (xi)
static uint8_t* g_encrypted_vote = NULL;
static size_t g_encrypted_vote_size = 0;

/**
 * @brief Encrypt votes and store the result in xi for later use
 * @param votes Array of votes to encrypt
 * @param vote_count Number of votes in the array (max 20)
 * @param n_data Public key n component
 * @param n_length Length of n_data
 * @param h_data Public key h component
 * @param h_length Length of h_data
 * @param ska_data Secret random key
 * @param ska_length Length of ska_data
 * @return 0 on success, negative value on error
 */
int encrypt_and_store(const uint32_t* votes, size_t vote_count,
                      const uint8_t* n_data, size_t n_length,
                      const uint8_t* h_data, size_t h_length,
                      const uint8_t* ska_data, size_t ska_length) {
    // Clear any existing encrypted vote
    clear_encrypted_vote();
    
    // Calculate the expected size of the encrypted result based on n
    // In Paillier encryption, the ciphertext size is generally 2 * n_length
    size_t expected_size = n_length * 2;
    
    // Allocate memory for the encrypted result
    g_encrypted_vote = (uint8_t*)malloc(expected_size);
    if (!g_encrypted_vote) {
        return -1; // Memory allocation failed
    }
    
    // Encrypt the votes
    int result = pack_and_encrypt_votes(
        votes, vote_count,
        n_data, n_length,
        h_data, h_length,
        ska_data, ska_length,
        g_encrypted_vote, expected_size
    );
    
    if (result != 0) {
        // Encryption failed, clean up
        free(g_encrypted_vote);
        g_encrypted_vote = NULL;
        g_encrypted_vote_size = 0;
        return result;
    }
    
    // Set the size of the encrypted vote
    g_encrypted_vote_size = expected_size;
    
    return 0;
}

/**
 * @brief Retrieve the stored encrypted vote (xi)
 * @param result Buffer to copy the encrypted vote into
 * @param result_length Length of the result buffer
 * @return Size of the encrypted vote in bytes, or negative value on error
 */
int get_encrypted_vote(uint8_t* result, size_t result_length) {
    if (!g_encrypted_vote || g_encrypted_vote_size == 0) {
        return -1; // No encrypted vote stored
    }
    
    if (result_length < g_encrypted_vote_size) {
        return -2; // Buffer too small
    }
    
    // Copy the encrypted vote to the result buffer
    memcpy(result, g_encrypted_vote, g_encrypted_vote_size);
    
    return (int)g_encrypted_vote_size;
}

/**
 * @brief Get the size of the stored encrypted vote
 * @return Size in bytes of the stored encrypted vote, or 0 if none exists
 */
size_t get_encrypted_vote_size() {
    return g_encrypted_vote_size;
}

/**
 * @brief Clear the stored encrypted vote
 * @return 0 on success
 */
int clear_encrypted_vote() {
    if (g_encrypted_vote) {
        free(g_encrypted_vote);
        g_encrypted_vote = NULL;
    }
    g_encrypted_vote_size = 0;
    return 0;
}

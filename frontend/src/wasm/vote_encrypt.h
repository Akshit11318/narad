#ifndef VOTE_ENCRYPT_H
#define VOTE_ENCRYPT_H

#include "bigint_ops.h"
#include <stdint.h>
#include <stdlib.h>

/**
 * @brief Pack an array of votes into a single BigInt, with each vote occupying 25 bits
 * @param votes Array of votes to pack
 * @param vote_count Number of votes in the array (max 20)
 * @return A BigInt containing the packed votes
 */
BigInt pack_votes(const uint32_t* votes, size_t vote_count);

/**
 * @brief Pack and encrypt votes
 * @param votes Array of votes to pack and encrypt
 * @param vote_count Number of votes in the array (max 20)
 * @param n_data Public key n component
 * @param n_length Length of n_data
 * @param h_data Public key h component
 * @param h_length Length of h_data
 * @param result Buffer to store the encrypted result
 * @param result_length Length of the result buffer
 * @return 0 on success, negative value on error
 */
int pack_and_encrypt_votes(const uint32_t* votes, size_t vote_count,
                           const uint8_t* n_data, size_t n_length,
                           const uint8_t* h_data, size_t h_length,
                           uint8_t* result, size_t result_length);

/**
 * @brief Encrypt votes and store the result in xi for later use
 * @param votes Array of votes to encrypt
 * @param vote_count Number of votes in the array (max 20)
 * @param n_data Public key n component
 * @param n_length Length of n_data
 * @param h_data Public key h component
 * @param h_length Length of h_data
 * @return 0 on success, negative value on error
 */
int encrypt_and_store(const uint32_t* votes, size_t vote_count,
                      const uint8_t* n_data, size_t n_length,
                      const uint8_t* h_data, size_t h_length
                      );

/**
 * @brief Retrieve the stored encrypted vote (xi)
 * @param result Buffer to copy the encrypted vote into
 * @param result_length Length of the result buffer
 * @return Size of the encrypted vote in bytes, or negative value on error
 */
int get_encrypted_vote(uint8_t* result, size_t result_length);

/**
 * @brief Get the size of the stored encrypted vote
 * @return Size in bytes of the stored encrypted vote, or 0 if none exists
 */
size_t get_encrypted_vote_size();

/**
 * @brief Clear the stored encrypted vote
 * @return 0 on success
 */
int clear_encrypted_vote();

#endif // VOTE_ENCRYPT_H

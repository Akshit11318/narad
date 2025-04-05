#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include "collector.h"

/**
 * @brief Fetch election parameters from the server
 * @param params Pointer to store the fetched election parameters
 * @return 0 on success, non-zero on failure
 */
int fetch_election_params(ElectionParams* params);

/**
 * @brief Fetch collector's public key from the server
 * @param public_key Pointer to store the fetched public key
 * @return 0 on success, non-zero on failure
 */
int fetch_collector_public_key(BigInt* public_key);

/**
 * @brief Push the final auxiliary value to the server
 * @param final_aux The final auxiliary value to push
 * @return 0 on success, non-zero on failure
 */
int push_final_aux_to_server(const BigInt* final_aux);

#endif /* HTTP_CLIENT_H */
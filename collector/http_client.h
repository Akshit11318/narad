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
 * @brief Fetch auxiliary values from voters
 * @param count Number of auxiliary values to fetch
 * @param process_callback Function to process each auxiliary value
 * @return Number of successfully processed values, or negative on error
 */
int fetch_auxiliary_values(int count, int (*process_callback)(const BigInt* aux_i));

/**
 * @brief Push the final auxiliary value to the server
 * @param final_aux The final auxiliary value to push
 * @return 0 on success, non-zero on failure
 */
int push_final_aux_to_server(const BigInt* final_aux);

/**
 * @brief Parse election parameters from JSON string
 * @param json_str JSON string containing election parameters
 * @param params Pointer to store the parsed election parameters
 * @return 0 on success, non-zero on failure
 */
int parse_election_params_json(const char* json_str, ElectionParams* params);

/**
 * @brief Convert BigInt to hexadecimal string
 * @param bigint Pointer to the BigInt to convert
 * @param hex_str Buffer to store the hexadecimal string
 * @param str_size Size of the buffer
 * @return 0 on success, non-zero on failure
 */
int bigint_to_hex_string(const BigInt* bigint, char* hex_str, size_t str_size);

/**
 * @brief Convert hexadecimal string to BigInt
 * @param hex_str Hexadecimal string to convert
 * @param bigint Pointer to store the converted BigInt
 * @return 0 on success, non-zero on failure
 */
int hex_string_to_bigint(const char* hex_str, BigInt* bigint);

#endif /* HTTP_CLIENT_H */
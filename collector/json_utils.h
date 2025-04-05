#ifndef JSON_UTILS_H
#define JSON_UTILS_H

#include "collector.h"

/**
 * @brief Parse election parameters from JSON string
 * @param json_str The JSON string containing election parameters
 * @param params Pointer to store the parsed parameters
 * @return 0 on success, non-zero on failure
 */
int parse_election_params_json(const char* json_str, ElectionParams* params);

/**
 * @brief Convert BigInt to hex string
 * @param big_int The BigInt to convert
 * @param hex_str Buffer to store the hex string
 * @param hex_str_size Size of the hex string buffer
 * @return 0 on success, non-zero on failure
 */
int bigint_to_hex_string(const BigInt* big_int, char* hex_str, size_t hex_str_size);

/**
 * @brief Convert hex string to BigInt
 * @param hex_str The hex string to convert
 * @param big_int Pointer to store the converted BigInt
 * @return 0 on success, non-zero on failure
 */
int hex_string_to_bigint(const char* hex_str, BigInt* big_int);

#endif /* JSON_UTILS_H */
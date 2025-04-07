#ifndef JSON_UTILS_H
#define JSON_UTILS_H

#include "collector.h"
#include "bigint_ops.h"

/**
 * @brief Parse election parameters from JSON string
 * @param json_str The JSON string containing election parameters
 * @param params Pointer to store the parsed parameters
 * @return 0 on success, non-zero on failure
 */
int parse_election_params_json(const char* json_str, ElectionParams* params);

#endif /* JSON_UTILS_H */
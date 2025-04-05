#include <curl/curl.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "http_client.h"
#include "bigint_ops.h"

#define API_BASE_URL "http://localhost:3000/api"
#define ELECTION_PARAMS_ENDPOINT "/election/params"
#define COLLECTOR_KEY_ENDPOINT "/collector/public-key"
#define FINAL_AUX_ENDPOINT "/auxiliary/final"

// Structure to hold response data
struct ResponseData {
    char* data;
    size_t size;
};

// Callback function to handle response data
static size_t write_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t realsize = size * nmemb;
    struct ResponseData* resp = (struct ResponseData*)userp;

    char* ptr = realloc(resp->data, resp->size + realsize + 1);
    if (!ptr) {
        fprintf(stderr, "Failed to allocate memory\n");
        return 0;
    }

    resp->data = ptr;
    memcpy(&(resp->data[resp->size]), contents, realsize);
    resp->size += realsize;
    resp->data[resp->size] = 0;

    return realsize;
}

// Helper function to perform HTTP GET request
static char* http_get(const char* endpoint) {
    CURL* curl;
    CURLcode res;
    struct ResponseData resp = {0};

    curl = curl_easy_init();
    if (!curl) {
        return NULL;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s%s", API_BASE_URL, endpoint);

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&resp);

    res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        free(resp.data);
        return NULL;
    }

    return resp.data;
}

// Helper function to perform HTTP POST request
static int http_post(const char* endpoint, const char* data) {
    CURL* curl;
    CURLcode res;
    struct curl_slist* headers = NULL;

    curl = curl_easy_init();
    if (!curl) {
        return -1;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s%s", API_BASE_URL, endpoint);

    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    res = curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return (res == CURLE_OK) ? 0 : -1;
}

int fetch_election_params(ElectionParams* params) {
    char* response = http_get(ELECTION_PARAMS_ENDPOINT);
    if (!response) {
        return -1;
    }

    int result = parse_election_params_json(response, params);
    free(response);
    return result;
}

int fetch_collector_public_key(BigInt* public_key) {
    char* response = http_get(COLLECTOR_KEY_ENDPOINT);
    if (!response) {
        return -1;
    }

    int result = parse_collector_public_key_json(response, public_key);
    free(response);
    return result;
}

int push_final_aux_to_server(const BigInt* final_aux) {
    char hex_str[1024];
    if (bigint_to_hex_string(final_aux, hex_str, sizeof(hex_str)) != 0) {
        return -1;
    }

    char json_data[1200];
    snprintf(json_data, sizeof(json_data), "{\"final_aux\":\"%s\"}", hex_str);

    return http_post(FINAL_AUX_ENDPOINT, json_data);
}
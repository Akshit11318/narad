#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include "../aggregator.h"

// Wrapper class for BigInt to manage memory
class BigIntWrapper {
public:
    BigIntWrapper() : bigint_({nullptr, 0}) {}
    
    BigIntWrapper(const uint8_t* data, size_t length) {
        bigint_ = create_bigint(data, length);
    }
    
    ~BigIntWrapper() {
        if (bigint_.data != nullptr) {
            free_bigint(&bigint_);
        }
    }
    
    // Prevent copying
    BigIntWrapper(const BigIntWrapper&) = delete;
    BigIntWrapper& operator=(const BigIntWrapper&) = delete;
    
    // Allow moving
    BigIntWrapper(BigIntWrapper&& other) noexcept : bigint_(other.bigint_) {
        other.bigint_.data = nullptr;
        other.bigint_.length = 0;
    }
    
    BigIntWrapper& operator=(BigIntWrapper&& other) noexcept {
        if (this != &other) {
            if (bigint_.data != nullptr) {
                free_bigint(&bigint_);
            }
            bigint_ = other.bigint_;
            other.bigint_.data = nullptr;
            other.bigint_.length = 0;
        }
        return *this;
    }
    
    BigInt* get() { return &bigint_; }
    const BigInt* get() const { return &bigint_; }
    
    // Convert to Napi::Value
    Napi::Value ToValue(Napi::Env env) const {
        Napi::Object obj = Napi::Object::New(env);
        
        // Create a Buffer for the data
        Napi::Buffer<uint8_t> dataBuffer;
        if (bigint_.data != nullptr && bigint_.length > 0) {
            dataBuffer = Napi::Buffer<uint8_t>::Copy(env, bigint_.data, bigint_.length);
        } else {
            dataBuffer = Napi::Buffer<uint8_t>::New(env, 0);
        }
        
        obj.Set("data", dataBuffer);
        obj.Set("length", Napi::Number::New(env, static_cast<double>(bigint_.length)));
        
        return obj;
    }
    
    // Create from Napi::Value
    static BigIntWrapper FromValue(const Napi::Value& value) {
        if (!value.IsObject()) {
            throw Napi::Error::New(value.Env(), "Expected an object for BigInt");
        }
        
        Napi::Object obj = value.As<Napi::Object>();
        if (!obj.Has("data") || !obj.Has("length")) {
            throw Napi::Error::New(value.Env(), "BigInt object must have data and length properties");
        }
        
        Napi::Value dataValue = obj.Get("data");
        if (!dataValue.IsBuffer()) {
            throw Napi::Error::New(value.Env(), "BigInt data must be a Buffer");
        }
        
        Napi::Buffer<uint8_t> dataBuffer = dataValue.As<Napi::Buffer<uint8_t>>();
        size_t length = obj.Get("length").ToNumber().Uint32Value();
        
        return BigIntWrapper(dataBuffer.Data(), length);
    }
    
private:
    BigInt bigint_;
};

// Global instance of AggregatorParams
static AggregatorParams g_params;
static bool g_initialized = false;

// Helper function to convert hex string to Uint8Array
std::vector<uint8_t> HexToUint8Array(const std::string& hex) {
    std::string cleanHex = hex;
    if (hex.substr(0, 2) == "0x") {
        cleanHex = hex.substr(2);
    }
    
    // Ensure even length
    if (cleanHex.length() % 2 != 0) {
        cleanHex = "0" + cleanHex;
    }
    
    fprintf(stderr, "[DEBUG] Converting hex string: %s (length: %zu)\n", 
            cleanHex.length() > 20 ? (cleanHex.substr(0, 10) + "..." + cleanHex.substr(cleanHex.length() - 10)).c_str() : cleanHex.c_str(), 
            cleanHex.length());
    
    // Validate hex string - ensure it only contains valid hex characters
    for (char c : cleanHex) {
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
            fprintf(stderr, "[ERROR] Invalid hex character detected: %c\n", c);
            // Replace invalid character with '0'
            c = '0';
        }
    }
    
    std::vector<uint8_t> bytesBigEndian(cleanHex.length() / 2);
    
    // Convert hex string to bytes (big-endian, MSB first)
    for (size_t i = 0; i < cleanHex.length(); i += 2) {
        try {
            // Convert hex string to byte value
            std::string byteStr = cleanHex.substr(i, 2);
            unsigned int byteVal = 0;
            
            // Use sscanf which is more reliable for hex conversion
            if (sscanf(byteStr.c_str(), "%2x", &byteVal) == 1) {
                bytesBigEndian[i / 2] = static_cast<uint8_t>(byteVal);
            } else {
                // If conversion fails, set to 0
                bytesBigEndian[i / 2] = 0;
                fprintf(stderr, "[ERROR] Error converting hex value: %s\n", byteStr.c_str());
            }
        } catch (const std::exception& e) {
            bytesBigEndian[i / 2] = 0;
            fprintf(stderr, "[ERROR] Exception in hex conversion: %s\n", e.what());
        }
    }
    
    // Validate the resulting byte array is not empty
    if (bytesBigEndian.empty()) {
        fprintf(stderr, "[ERROR] Resulting byte array is empty\n");
        bytesBigEndian.push_back(0);
    }
    
    // Reverse to little-endian (BigInt convention in this codebase)
    std::vector<uint8_t> bytes(bytesBigEndian.rbegin(), bytesBigEndian.rend());
    
    return bytes;
}

// Helper function to convert BigInt to hex string
std::string BigIntToHexString(const BigInt* bigInt) {
    if (!bigInt || !bigInt->data || bigInt->length == 0) {
        return "0x0";
    }
    
    std::string hexString = "0x";
    for (size_t i = bigInt->length; i > 0; i--) {
        char hex[3];
        snprintf(hex, sizeof(hex), "%02x", bigInt->data[i - 1]);
        hexString += hex;
    }
    
    return hexString;
}

// Create a BigInt from a hex string with improved error handling
Napi::Value CreateBigIntFromHex(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 1 || !info[0].IsString()) {
            throw Napi::TypeError::New(env, "Expected a hex string");
        }
        
        std::string hexStr = info[0].As<Napi::String>().Utf8Value();
        
        // Simple validation of the hex string
        if (hexStr.empty()) {
            throw Napi::Error::New(env, "Hex string is empty");
        }
        
        std::vector<uint8_t> bytes = HexToUint8Array(hexStr);
        
        if (bytes.empty()) {
            throw Napi::Error::New(env, "Failed to convert hex string to bytes");
        }
        
        BigIntWrapper bigint(bytes.data(), bytes.size());
        if (!bigint.get()->data || bigint.get()->length == 0) {
            throw Napi::Error::New(env, "Failed to create BigInt from bytes");
        }
        
        return bigint.ToValue(env);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Initialize the aggregator
Napi::Value AggregatorInit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 3) {
            throw Napi::TypeError::New(env, "Expected N, H, and skA parameters");
        }
        
        // Clean up previous initialization if necessary
        if (g_initialized) {
            aggregator_cleanup(&g_params);
            g_initialized = false;
        }
        
        // Extract parameters from the arguments
        BigIntWrapper N = BigIntWrapper::FromValue(info[0]);
        BigIntWrapper H = BigIntWrapper::FromValue(info[1]);
        BigIntWrapper skA = BigIntWrapper::FromValue(info[2]);
        
        fprintf(stderr, "[DEBUG] Initializing aggregator with N length: %zu, H length: %zu, skA length: %zu\n",
                N.get()->length, H.get()->length, skA.get()->length);
                
        // Check value ranges
        if (N.get()->length == 0 || N.get()->data == nullptr) {
            fprintf(stderr, "[ERROR] N parameter is invalid\n");
            return Napi::Number::New(env, -100);
        }
        
        if (H.get()->length == 0 || H.get()->data == nullptr) {
            fprintf(stderr, "[ERROR] H parameter is invalid\n");
            return Napi::Number::New(env, -101);
        }
        
        if (skA.get()->length == 0 || skA.get()->data == nullptr) {
            fprintf(stderr, "[ERROR] skA parameter is invalid\n");
            return Napi::Number::New(env, -102);
        }
        
        // Log skA data for debugging
        fprintf(stderr, "[DEBUG] skA first few bytes: ");
        for (size_t i = 0; i < std::min(skA.get()->length, (size_t)8); i++) {
            fprintf(stderr, "%02x ", skA.get()->data[i]);
        }
        fprintf(stderr, "\n");
        
        // Initialize the aggregator
        memset(&g_params, 0, sizeof(AggregatorParams));
fprintf(stderr, "[DEBUG] Calling aggregator_init...\n");
        int result = aggregator_init(&g_params, N.get(), H.get(), skA.get());
fprintf(stderr, "[DEBUG] aggregator_init returned: %d\n", result);
        
        if (result != 0) {
            fprintf(stderr, "[ERROR] Failed to initialize aggregator: %d\n", result);
            return Napi::Number::New(env, result);
        }
        
        fprintf(stderr, "[DEBUG] Aggregator initialization successful\n");
        g_initialized = true;
        return Napi::Number::New(env, 0); // Success
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in AggregatorInit: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Reset the running product
Napi::Value ResetRunningProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            throw Napi::Error::New(env, "Aggregator not initialized");
        }
        
        fprintf(stderr, "[DEBUG] Resetting running product\n");
        int result = reset_running_product(&g_params);
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in ResetRunningProduct: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Add a ciphertext to the running product
Napi::Value AddCiphertextToProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            throw Napi::Error::New(env, "Aggregator not initialized");
        }
        
        if (info.Length() < 1) {
            throw Napi::TypeError::New(env, "Expected ciphertext parameter");
        }
        
        // Extract ciphertext from arguments
        BigIntWrapper ciphertext = BigIntWrapper::FromValue(info[0]);
        
        // Add ciphertext to the running product
        int result = add_ciphertext_to_product(ciphertext.get(), &g_params);
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in AddCiphertextToProduct: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Get the current running product
Napi::Value GetRunningProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            throw Napi::Error::New(env, "Aggregator not initialized");
        }
        
        // Create a BigInt to hold the result
        BigInt result = {nullptr, 0};
        
        // Get the running product
        int status = get_running_product(&g_params, &result);
        
        if (status != 0) {
            throw Napi::Error::New(env, "Failed to get running product");
        }
        
        // Convert the result to a JS object
        BigIntWrapper resultWrapper(result.data, result.length);
        return resultWrapper.ToValue(env);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in GetRunningProduct: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Aggregate votes from the running product
Napi::Value AggregateVotesFromRunningProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            throw Napi::Error::New(env, "Aggregator not initialized");
        }
        
        if (info.Length() < 1) {
            throw Napi::TypeError::New(env, "Expected auxiliary value parameter");
        }
        
        // Extract auxiliary value from arguments
        BigIntWrapper aux = BigIntWrapper::FromValue(info[0]);
        
        // Create a BigInt to hold the result
        BigInt result = {nullptr, 0};
        
        fprintf(stderr, "[DEBUG] Starting vote aggregation process\n");
        fprintf(stderr, "[DEBUG] Auxiliary value length: %zu bytes\n", aux.get()->length);
        fprintf(stderr, "[DEBUG] Running product length: %zu bytes\n", g_params.running_product.length);
        
        // Aggregate votes with detailed progress logging
        fprintf(stderr, "[TRACE] Step 1: About to call aggregate_votes_from_running_product\n");
        int status = aggregate_votes_from_running_product(aux.get(), &g_params, &result);
        fprintf(stderr, "[TRACE] Step 2: aggregate_votes_from_running_product returned: %d\n", status);
        
        if (status != 0) {
            fprintf(stderr, "[ERROR] Failed to aggregate votes: %d\n", status);
            return Napi::Number::New(env, status);
        }
        
        fprintf(stderr, "[DEBUG] Aggregation successful, result length: %zu bytes\n", result.length);
        
        // Convert the result to a JS object
        BigIntWrapper resultWrapper(result.data, result.length);
        return resultWrapper.ToValue(env);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in AggregateVotesFromRunningProduct: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Unpack votes
Napi::Value UnpackVotes(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            throw Napi::Error::New(env, "Aggregator not initialized");
        }
        
        if (info.Length() < 2) {
            throw Napi::TypeError::New(env, "Expected packed votes and max votes parameters");
        }
        
        // Extract parameters
        BigIntWrapper packed_votes = BigIntWrapper::FromValue(info[0]);
        size_t max_votes = info[1].ToNumber().Uint32Value();
        
        fprintf(stderr, "[DEBUG] Unpacking votes, max votes: %zu\n", max_votes);
        
        // Allocate memory for unpacked votes
        std::vector<uint32_t> votes(max_votes, 0);
        
        // Unpack the votes
        int num_votes = unpack_votes(packed_votes.get(), votes.data(), max_votes);
        
        if (num_votes < 0) {
            fprintf(stderr, "[ERROR] Failed to unpack votes: %d\n", num_votes);
            return Napi::Number::New(env, num_votes);
        }
        
        // Create a JavaScript array with the unpacked votes
        Napi::Array result = Napi::Array::New(env, num_votes);
        for (int i = 0; i < num_votes; i++) {
            result.Set(i, Napi::Number::New(env, votes[i]));
        }
        
        return result;
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in UnpackVotes: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Convert a BigInt to a string
Napi::Value BigIntToString(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 1) {
            throw Napi::TypeError::New(env, "Expected BigInt parameter");
        }
        
        // Extract BigInt from arguments
        BigIntWrapper bigint = BigIntWrapper::FromValue(info[0]);
        
        // Convert to hex string
        std::string hexString = BigIntToHexString(bigint.get());
        
        return Napi::String::New(env, hexString);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in BigIntToString: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Clean up the aggregator
Napi::Value AggregatorCleanup(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!g_initialized) {
            fprintf(stderr, "[INFO] Aggregator not initialized, nothing to clean up\n");
            return Napi::Number::New(env, 0); // Nothing to clean up
        }
        
        fprintf(stderr, "[DEBUG] Cleaning up aggregator resources\n");
        
        // Clean up the aggregator
        int result = aggregator_cleanup(&g_params);
        fprintf(stderr, "[DEBUG] aggregator_cleanup returned: %d\n", result);
        
        g_initialized = false;
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in AggregatorCleanup: %s\n", e.what());
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Register the functions
    exports.Set("createBigIntFromHex", Napi::Function::New(env, CreateBigIntFromHex));
    exports.Set("aggregatorInit", Napi::Function::New(env, AggregatorInit));
    exports.Set("resetRunningProduct", Napi::Function::New(env, ResetRunningProduct));
    exports.Set("addCiphertextToProduct", Napi::Function::New(env, AddCiphertextToProduct));
    exports.Set("getRunningProduct", Napi::Function::New(env, GetRunningProduct));
    exports.Set("aggregateVotesFromRunningProduct", Napi::Function::New(env, AggregateVotesFromRunningProduct));
    exports.Set("unpackVotes", Napi::Function::New(env, UnpackVotes));
    exports.Set("bigIntToString", Napi::Function::New(env, BigIntToString));
    exports.Set("aggregatorCleanup", Napi::Function::New(env, AggregatorCleanup));
    
    return exports;
}

NODE_API_MODULE(aggregator, Init)
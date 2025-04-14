#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include "../collector.h"

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

// Wrapper class for ElectionParams to manage memory
class ElectionParamsWrapper {
public:
    ElectionParamsWrapper() : initialized_(false) {
        // Initialize with empty values
        memset(&params_, 0, sizeof(ElectionParams));
    }
    
    ~ElectionParamsWrapper() {
        if (initialized_) {
            collector_cleanup();
            initialized_ = false;
        }
    }
    
    // Prevent copying
    ElectionParamsWrapper(const ElectionParamsWrapper&) = delete;
    ElectionParamsWrapper& operator=(const ElectionParamsWrapper&) = delete;
    
    // Allow moving
    ElectionParamsWrapper(ElectionParamsWrapper&& other) noexcept 
        : params_(other.params_), initialized_(other.initialized_) {
        other.initialized_ = false;
        memset(&other.params_, 0, sizeof(ElectionParams));
    }
    
    ElectionParamsWrapper& operator=(ElectionParamsWrapper&& other) noexcept {
        if (this != &other) {
            if (initialized_) {
                collector_cleanup();
            }
            params_ = other.params_;
            initialized_ = other.initialized_;
            other.initialized_ = false;
            memset(&other.params_, 0, sizeof(ElectionParams));
        }
        return *this;
    }
    
    bool Initialize(const BigIntWrapper& N, const BigIntWrapper& H) {
        if (initialized_) {
            collector_cleanup();
            initialized_ = false;
        }
        
        // Create ElectionParams structure
        params_.N = *N.get();
        // Calculate N_squared = N * N
        // Allocate space for N^2 and perform multiplication without modulo
        size_t n_length = N.get()->length;
        uint8_t* product = (uint8_t*)calloc(n_length * 2, 1);
        
        if (!product) {
            fprintf(stderr, "[ERROR] Memory allocation failed for N_squared\n");
            return false;
        }
        
        // Perform simple multiplication N * N
        for (size_t i = 0; i < n_length; i++) {
            uint16_t carry = 0;
            for (size_t j = 0; j < n_length || carry; j++) {
                if (i + j < n_length * 2) {
                    uint32_t current = product[i + j];
                    if (j < n_length) {
                        current += (uint32_t)N.get()->data[i] * N.get()->data[j];
                    }
                    current += carry;
                    product[i + j] = current & 0xFF;
                    carry = current >> 8;
                }
            }
        }
        
        // Create BigInt from product
        params_.N_squared = create_bigint(product, n_length * 2);
        free(product);
        
        // Verify the calculation succeeded
        if (!params_.N_squared.data) {
            fprintf(stderr, "[ERROR] Failed to create N_squared BigInt\n");
            return false;
        }
        params_.H = *H.get();
        
        int result = collector_init(&params_);
        initialized_ = (result == 0);
        return initialized_;
    }
    
    ElectionParams* get() { return &params_; }
    const ElectionParams* get() const { return &params_; }
    
private:
    ElectionParams params_;
    bool initialized_;
};

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
    
    fprintf(stderr, "[DEBUG] Processing hex string of length %zu\n", cleanHex.length());
    
    // Validate hex string - ensure it only contains valid hex characters
    for (char c : cleanHex) {
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
            fprintf(stderr, "[ERROR] Invalid hex character detected: %c\n", c);
            // Replace invalid character with '0'
            c = '0';
        }
    }
    
    // Create bytes array - BigInt expects big-endian format (most significant byte first)
    std::vector<uint8_t> bytes(cleanHex.length() / 2);
    
    // Convert hex string to bytes - store in big-endian format
    for (size_t i = 0; i < cleanHex.length(); i += 2) {
        try {
            // Convert hex string to byte value
            std::string byteStr = cleanHex.substr(i, 2);
            unsigned int byteVal = 0;
            
            // Use sscanf which is more reliable for hex conversion
            if (sscanf(byteStr.c_str(), "%2x", &byteVal) == 1) {
                // Store in big-endian order (most significant byte first)
                bytes[i / 2] = static_cast<uint8_t>(byteVal);
            } else {
                // If conversion fails, set to 0
                bytes[i / 2] = 0;
                // Log the error but continue processing
                fprintf(stderr, "[ERROR] Error converting hex value: %s\n", byteStr.c_str());
            }
        } catch (const std::exception& e) {
            // Handle any unexpected exceptions
            bytes[i / 2] = 0;
            fprintf(stderr, "[ERROR] Exception in hex conversion: %s\n", e.what());
        }
    }
    
    // Log the conversion for debugging
    fprintf(stderr, "[DEBUG] Converted hex string of length %zu to %zu bytes\n", 
            cleanHex.length(), bytes.size());
    
    // Validate the resulting byte array is not empty
    if (bytes.empty()) {
        fprintf(stderr, "[ERROR] Resulting byte array is empty\n");
        // Add a default value to prevent empty BigInt
        bytes.push_back(0);
    }
    
    return bytes;
}

// Global instance of ElectionParamsWrapper
static std::unique_ptr<ElectionParamsWrapper> g_params_wrapper;

// Create a BigInt from a hex string
Napi::Value CreateBigIntFromHex(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        throw Napi::Error::New(env, "Expected a hex string");
    }
    
    std::string hexStr = info[0].As<Napi::String>().Utf8Value();
    std::vector<uint8_t> bytes = HexToUint8Array(hexStr);
    
    BigIntWrapper bigint(bytes.data(), bytes.size());
    return bigint.ToValue(env);
}

// Initialize the collector
Napi::Value CollectorInit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        throw Napi::Error::New(env, "Expected N and H parameters");
    }
    
    try {
        // Create a new ElectionParamsWrapper
        g_params_wrapper = std::make_unique<ElectionParamsWrapper>();
        
        // Extract N and H from the arguments
        BigIntWrapper N = BigIntWrapper::FromValue(info[0]);
        BigIntWrapper H = BigIntWrapper::FromValue(info[1]);
        
        // Initialize the collector
        bool success = g_params_wrapper->Initialize(N, H);
        
        if (!success) {
            throw Napi::Error::New(env, "Failed to initialize collector");
        }
        
        return Napi::Number::New(env, 0); // Success
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// Process an auxiliary value
// Process an auxiliary value
Napi::Value ProcessAuxiliaryValue(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        throw Napi::Error::New(env, "Expected auxiliary value");
    }
    
    try {
        // Log the start of processing
        fprintf(stderr, "[DEBUG] Starting to process auxiliary value\n");
        
        // Extract auxiliary value from the arguments
        BigIntWrapper aux = BigIntWrapper::FromValue(info[0]);
        
        // Log the auxiliary value details
        fprintf(stderr, "[DEBUG] Auxiliary value extracted, length: %zu bytes\n", aux.get()->length);
        
        // Process the auxiliary value
        fprintf(stderr, "[DEBUG] Calling process_auxiliary_value_realtime...\n");
        int result = process_auxiliary_value_realtime(aux.get());
        fprintf(stderr, "[DEBUG] process_auxiliary_value_realtime returned: %d\n", result);
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        fprintf(stderr, "[ERROR] Exception in ProcessAuxiliaryValue: %s\n", e.what());
        throw Napi::Error::New(env, e.what());
    }
}

// Get the current auxiliary product
Napi::Value GetCurrentAuxiliaryProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        // Create a BigInt to hold the result
        BigInt result;
        
        // Get the current auxiliary product
        int status = get_current_auxiliary_product(&result);
        
        if (status != 0) {
            throw Napi::Error::New(env, "Failed to get current auxiliary product");
        }
        
        // Convert the result to a JS object
        BigIntWrapper resultWrapper(result.data, result.length);
        Napi::Value jsResult = resultWrapper.ToValue(env);
        
        // Free the result BigInt
        free_bigint(&result);
        
        return jsResult;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// Reset the auxiliary product
Napi::Value ResetAuxiliaryProduct(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        // Reset the auxiliary product
        int result = reset_auxiliary_product();
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// Clean up the collector
Napi::Value CollectorCleanup(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        // Clean up the collector
        int result = collector_cleanup();
        
        // Reset the global wrapper
        g_params_wrapper.reset();
        
        return Napi::Number::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Register the functions
    exports.Set("createBigIntFromHex", Napi::Function::New(env, CreateBigIntFromHex));
    exports.Set("collectorInit", Napi::Function::New(env, CollectorInit));
    exports.Set("processAuxiliaryValue", Napi::Function::New(env, ProcessAuxiliaryValue));
    exports.Set("getCurrentAuxiliaryProduct", Napi::Function::New(env, GetCurrentAuxiliaryProduct));
    exports.Set("resetAuxiliaryProduct", Napi::Function::New(env, ResetAuxiliaryProduct));
    exports.Set("collectorCleanup", Napi::Function::New(env, CollectorCleanup));
    
    return exports;
}

NODE_API_MODULE(collector, Init)
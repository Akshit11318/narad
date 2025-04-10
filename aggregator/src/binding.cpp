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

// Wrapper class for AggregatorParams to manage memory
class AggregatorParamsWrapper {
public:
    AggregatorParamsWrapper() : initialized_(false) {
        // Initialize with empty values
        memset(&params_, 0, sizeof(AggregatorParams));
    }
    
    ~AggregatorParamsWrapper() {
        if (initialized_) {
            aggregator_cleanup(&params_);
            initialized_ = false;
        }
    }
    
    // Prevent copying
    AggregatorParamsWrapper(const AggregatorParamsWrapper&) = delete;
    AggregatorParamsWrapper& operator=(const AggregatorParamsWrapper&) = delete;
    
    // Allow moving
    AggregatorParamsWrapper(AggregatorParamsWrapper&& other) noexcept 
        : params_(other.params_), initialized_(other.initialized_) {
        other.initialized_ = false;
        memset(&other.params_, 0, sizeof(AggregatorParams));
    }
    
    AggregatorParamsWrapper& operator=(AggregatorParamsWrapper&& other) noexcept {
        if (this != &other) {
            if (initialized_) {
                aggregator_cleanup(&params_);
            }
            params_ = other.params_;
            initialized_ = other.initialized_;
            other.initialized_ = false;
            memset(&other.params_, 0, sizeof(AggregatorParams));
        }
        return *this;
    }
    
    bool Initialize(const BigIntWrapper& N, const BigIntWrapper& H, const BigIntWrapper& skA) {
        if (initialized_) {
            aggregator_cleanup(&params_);
            initialized_ = false;
        }
        
        int result = aggregator_init(&params_, N.get(), H.get(), skA.get());
        initialized_ = (result == 0);
        return initialized_;
    }
    
    AggregatorParams* get() { return &params_; }
    const AggregatorParams* get() const { return &params_; }
    
    // Convert to Napi::Value
    Napi::Value ToValue(Napi::Env env) const {
        Napi::Object obj = Napi::Object::New(env);
        
        // Convert each BigInt field
        if (initialized_) {
            // Create a wrapper for each BigInt field and convert to JS object
            BigIntWrapper N(params_.N.data, params_.N.length);
            BigIntWrapper N_squared(params_.N_squared.data, params_.N_squared.length);
            BigIntWrapper H(params_.H.data, params_.H.length);
            BigIntWrapper sk_A(params_.sk_A.data, params_.sk_A.length);
            BigIntWrapper sk_A_mod_N(params_.sk_A_mod_N.data, params_.sk_A_mod_N.length);
            BigIntWrapper sk_A_inv(params_.sk_A_inv.data, params_.sk_A_inv.length);
            BigIntWrapper running_product(params_.running_product.data, params_.running_product.length);
            
            obj.Set("N", N.ToValue(env));
            obj.Set("N_squared", N_squared.ToValue(env));
            obj.Set("H", H.ToValue(env));
            obj.Set("sk_A", sk_A.ToValue(env));
            obj.Set("sk_A_mod_N", sk_A_mod_N.ToValue(env));
            obj.Set("sk_A_inv", sk_A_inv.ToValue(env));
            obj.Set("running_product", running_product.ToValue(env));
            
            // Mark as initialized
            obj.Set("initialized", Napi::Boolean::New(env, true));
        } else {
            obj.Set("initialized", Napi::Boolean::New(env, false));
        }
        
        return obj;
    }
    
private:
    AggregatorParams params_;
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
    
    std::vector<uint8_t> bytes(cleanHex.length() / 2);
    for (size_t i = 0; i < cleanHex.length(); i += 2) {
        bytes[i / 2] = static_cast<uint8_t>(std::stoi(cleanHex.substr(i, 2), nullptr, 16));
    }
    
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

// Node-API wrapper class
class AggregatorAddon : public Napi::ObjectWrap<AggregatorAddon> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);
        
        Napi::Function func = DefineClass(env, "AggregatorAddon", {
            InstanceMethod<&AggregatorAddon::AggregatorInit>("aggregatorInit"),
            InstanceMethod<&AggregatorAddon::AddCiphertextToProduct>("addCiphertextToProduct"),
            InstanceMethod<&AggregatorAddon::ResetRunningProduct>("resetRunningProduct"),
            InstanceMethod<&AggregatorAddon::GetRunningProduct>("getRunningProduct"),
            InstanceMethod<&AggregatorAddon::RaiseToSkA>("raiseToSkA"),
            InstanceMethod<&AggregatorAddon::DivideOutMask>("divideOutMask"),
            InstanceMethod<&AggregatorAddon::RecoverSum>("recoverSum"),
            InstanceMethod<&AggregatorAddon::AggregateVotesFromRunningProduct>("aggregateVotesFromRunningProduct"),
            InstanceMethod<&AggregatorAddon::UnpackVotes>("unpackVotes"),
            InstanceMethod<&AggregatorAddon::AggregatorCleanup>("aggregatorCleanup"),
            InstanceMethod<&AggregatorAddon::CreateBigIntFromHex>("createBigIntFromHex"),
            InstanceMethod<&AggregatorAddon::FreeBigInt>("freeBigInt"),
            InstanceMethod<&AggregatorAddon::BigIntToString>("bigIntToString"),
        });
        
        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);
        
        exports.Set("AggregatorAddon", func);
        return exports;
    }
    
    AggregatorAddon(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AggregatorAddon>(info) {
        Napi::Env env = info.Env();
        Napi::HandleScope scope(env);
        
        // Initialize the aggregator params wrapper
        params_ = std::make_unique<AggregatorParamsWrapper>();
    }
    
private:
    std::unique_ptr<AggregatorParamsWrapper> params_;
    
    // Method implementations
    Napi::Value AggregatorInit(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper N = BigIntWrapper::FromValue(info[0]);
            BigIntWrapper H = BigIntWrapper::FromValue(info[1]);
            BigIntWrapper skA = BigIntWrapper::FromValue(info[2]);
            
            bool success = params_->Initialize(N, H, skA);
            return Napi::Number::New(env, success ? 0 : 1);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value AddCiphertextToProduct(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper ciphertext = BigIntWrapper::FromValue(info[0]);
            int result = add_ciphertext_to_product(ciphertext.get(), params_->get());
            return Napi::Number::New(env, result);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value ResetRunningProduct(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        try {
            int result = reset_running_product(params_->get());
            return Napi::Number::New(env, result);
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value GetRunningProduct(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        try {
            BigIntWrapper result;
            int status = get_running_product(params_->get(), result.get());
            
            if (status != 0) {
                return Napi::Number::New(env, status);
            }
            
            return result.ToValue(env);
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value RaiseToSkA(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper product = BigIntWrapper::FromValue(info[0]);
            BigIntWrapper result;
            
            int status = raise_to_sk_A(product.get(), params_->get(), result.get());
            
            if (status != 0) {
                return Napi::Number::New(env, status);
            }
            
            return result.ToValue(env);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value DivideOutMask(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 2) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper P = BigIntWrapper::FromValue(info[0]);
            BigIntWrapper aux = BigIntWrapper::FromValue(info[1]);
            BigIntWrapper result;
            
            int status = divide_out_mask(P.get(), aux.get(), params_->get(), result.get());
            
            if (status != 0) {
                return Napi::Number::New(env, status);
            }
            
            return result.ToValue(env);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value RecoverSum(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper P_prime = BigIntWrapper::FromValue(info[0]);
            BigIntWrapper result;
            
            int status = recover_sum(P_prime.get(), params_->get(), result.get());
            
            if (status != 0) {
                return Napi::Number::New(env, status);
            }
            
            return result.ToValue(env);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value AggregateVotesFromRunningProduct(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper aux = BigIntWrapper::FromValue(info[0]);
            BigIntWrapper result;
            
            int status = aggregate_votes_from_running_product(aux.get(), params_->get(), result.get());
            
            if (status != 0) {
                return Napi::Number::New(env, status);
            }
            
            return result.ToValue(env);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value UnpackVotes(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 2) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper packed_votes = BigIntWrapper::FromValue(info[0]);
            size_t max_votes = info[1].ToNumber().Uint32Value();
            
            // Allocate memory for unpacked votes
            std::vector<uint32_t> votes(max_votes, 0);
            
            int num_votes = unpack_votes(packed_votes.get(), votes.data(), max_votes);
            
            if (num_votes < 0) {
                return Napi::Number::New(env, num_votes); // Return error code
            }
            
            // Create a JavaScript array with the unpacked votes
            Napi::Array result = Napi::Array::New(env, num_votes);
            for (int i = 0; i < num_votes; i++) {
                result.Set(i, Napi::Number::New(env, votes[i]));
            }
            
            return result;
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value AggregatorCleanup(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        try {
            // Create a new params wrapper which will clean up the old one
            params_ = std::make_unique<AggregatorParamsWrapper>();
            return Napi::Number::New(env, 0);
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value CreateBigIntFromHex(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Expected a hex string").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            std::string hexString = info[0].ToString();
            std::vector<uint8_t> bytes = HexToUint8Array(hexString);
            
            BigIntWrapper bigint(bytes.data(), bytes.size());
            return bigint.ToValue(env);
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
    
    Napi::Value FreeBigInt(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        // No need to explicitly free - the BigIntWrapper will handle cleanup
        return env.Undefined();
    }
    
    Napi::Value BigIntToString(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            BigIntWrapper bigint = BigIntWrapper::FromValue(info[0]);
            std::string hexString = BigIntToHexString(bigint.get());
            return Napi::String::New(env, hexString);
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        } catch (const std::exception& e) {
            Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
            return env.Null();
        }
    }
};

// Initialize the addon
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return AggregatorAddon::Init(env, exports);
}

// Register the addon
NODE_API_MODULE(aggregator, InitAll)
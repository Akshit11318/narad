cmake_minimum_required(VERSION 3.15)

# This is a minimal "dummy" root CMakeLists.txt file
# It only checks for git submodules without setting up a full build

# Check if git submodules are initialized
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/deps/curl/CMakeLists.txt" OR 
   NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/deps/libtommath/CMakeLists.txt")
  message(WARNING "Git submodules not found. Please run: git submodule update --init --recursive")
endif()

project(VotingSystem LANGUAGES C CXX)

message(STATUS "Root CMakeLists.txt is not used for builds.")
message(STATUS "Please build individual modules directly:")
message(STATUS "  - For aggregator: cd aggregator && cmake-js compile")
message(STATUS "  - For collector: cd collector && cmake-js compile") 
message(STATUS "  - For WASM: cd build-wasm && emcmake cmake ../frontend/src/wasm && cmake --build .")

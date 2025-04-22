# FindEmscripten.cmake
# Simple find module for Emscripten SDK
# This improves compatibility with WSL environments

# Try to find emcc executable
find_program(EMSCRIPTEN_EMCC emcc)

if(EMSCRIPTEN_EMCC)
    # Get version information from emcc
    execute_process(
        COMMAND ${EMSCRIPTEN_EMCC} --version
        OUTPUT_VARIABLE EMSCRIPTEN_VERSION_OUTPUT
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
    )
    
    # Extract just the version number using regex
    if(EMSCRIPTEN_VERSION_OUTPUT MATCHES "([0-9]+\\.[0-9]+\\.[0-9]+)")
        set(Emscripten_VERSION "${CMAKE_MATCH_1}")
    else()
        set(Emscripten_VERSION "unknown")
    endif()
    
    # Find key emscripten tools
    find_program(EMSCRIPTEN_EMXX em++)
    find_program(EMSCRIPTEN_EMAR emar)
    find_program(EMSCRIPTEN_EMCMAKE emcmake)
    
    # Set variables for common paths - these may be used by subprojects
    get_filename_component(EMSCRIPTEN_ROOT_DIR "${EMSCRIPTEN_EMCC}" DIRECTORY)
    set(EMSCRIPTEN_INCLUDE_DIR "${EMSCRIPTEN_ROOT_DIR}/cache/sysroot/include")
    set(EMSCRIPTEN_SYSTEM_INCLUDE_DIR "${EMSCRIPTEN_ROOT_DIR}/system/include")
    
    # Try to locate the toolchain file
    # Common locations in standard Emscripten installations
    set(TOOLCHAIN_POSSIBLE_LOCATIONS
        "${EMSCRIPTEN_ROOT_DIR}/cmake/Modules/Platform/Emscripten.cmake"
        "${EMSCRIPTEN_ROOT_DIR}/../cmake/Modules/Platform/Emscripten.cmake"
        "${EMSCRIPTEN_ROOT_DIR}/../../upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
        "$ENV{EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
        "${EMSCRIPTEN_ROOT_DIR}/../../toolchain/emscripten/cmake/Modules/Platform/Emscripten.cmake"
            )
    
    foreach(TOOLCHAIN_PATH ${TOOLCHAIN_POSSIBLE_LOCATIONS})
        if(EXISTS "${TOOLCHAIN_PATH}")
            set(EMSCRIPTEN_TOOLCHAIN_FILE "${TOOLCHAIN_PATH}" CACHE PATH "Path to Emscripten toolchain file")
            break()
        endif()
    endforeach()
    
    # If we found emcc but not the toolchain file, print helpful debug info
    if(NOT DEFINED EMSCRIPTEN_TOOLCHAIN_FILE)
        message(STATUS "Found emcc at: ${EMSCRIPTEN_EMCC}")
        message(STATUS "But could not automatically find Emscripten.cmake toolchain file.")
        message(STATUS "Please run: source /path/to/emsdk/emsdk_env.sh")
        message(STATUS "Then try again or manually specify with: -DCMAKE_TOOLCHAIN_FILE=/correct/path/to/Emscripten.cmake")
        
        # Try to help by checking EMSDK environment variable
        if(DEFINED ENV{EMSDK})
            message(STATUS "EMSDK environment variable is set to: $ENV{EMSDK}")
            message(STATUS "Try: -DCMAKE_TOOLCHAIN_FILE=$ENV{EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake")
        else()
            message(STATUS "EMSDK environment variable is not set. Did you activate the emsdk?")
        endif()
    else()
        message(STATUS "Found Emscripten toolchain file: ${EMSCRIPTEN_TOOLCHAIN_FILE}")
    endif()
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Emscripten 
    VERSION_VAR Emscripten_VERSION
    REQUIRED_VARS EMSCRIPTEN_EMCC EMSCRIPTEN_ROOT_DIR
)

if(Emscripten_FOUND AND NOT TARGET Emscripten::Emscripten)
    add_library(Emscripten::Emscripten INTERFACE IMPORTED)
    
    # If we found the toolchain file, set it as a property that can be retrieved
    if(DEFINED EMSCRIPTEN_TOOLCHAIN_FILE)
        set_target_properties(Emscripten::Emscripten PROPERTIES
            INTERFACE_EMSCRIPTEN_TOOLCHAIN_FILE "${EMSCRIPTEN_TOOLCHAIN_FILE}")
    endif()
endif()

mark_as_advanced(
    EMSCRIPTEN_EMCC
    EMSCRIPTEN_EMXX
    EMSCRIPTEN_EMAR
    EMSCRIPTEN_EMCMAKE
    EMSCRIPTEN_ROOT_DIR
    EMSCRIPTEN_INCLUDE_DIR
    EMSCRIPTEN_SYSTEM_INCLUDE_DIR
)
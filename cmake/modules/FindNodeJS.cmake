# FindNodeJS.cmake
# Find NodeJS and its development components
#
# This module defines:
#  NodeJS_FOUND          - True if NodeJS was found
#  NodeJS_VERSION        - NodeJS version
#  NodeJS_INCLUDE_DIRS   - Include directories for NodeJS
#  NodeJS_LIBRARIES      - NodeJS libraries (if any)

# Find Node.js executable
find_program(NodeJS_EXECUTABLE NAMES node nodejs)
mark_as_advanced(NodeJS_EXECUTABLE)

if(NodeJS_EXECUTABLE)
    # Get version information
    execute_process(
        COMMAND ${NodeJS_EXECUTABLE} --version
        OUTPUT_VARIABLE _NodeJS_VERSION
        ERROR_QUIET
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    
    if(_NodeJS_VERSION MATCHES "^v([0-9]+\\.[0-9]+\\.[0-9]+)$")
        set(NodeJS_VERSION "${CMAKE_MATCH_1}")
    endif()
    
    # Auto-detect Node.js include directory - try different methods
    
    # Method 1: Try node-addon-api include path
    execute_process(
        COMMAND ${NodeJS_EXECUTABLE} -e "try { console.log(require('node-addon-api').include) } catch(e) {}"
        OUTPUT_VARIABLE _NodeJS_INCLUDE_DIR
        ERROR_QUIET
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    
    # Method 2: Try using node-gyp list command to find headers
    if(NOT _NodeJS_INCLUDE_DIR)
        execute_process(
            COMMAND npm list -g node-gyp
            OUTPUT_VARIABLE _NodeJS_NODEGYP_CHECK
            ERROR_QUIET
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        
        if(_NodeJS_NODEGYP_CHECK MATCHES "node-gyp")
            message(STATUS "Found node-gyp installed globally")
            
            # Try to find user home directory for node-gyp cache location
            if(WIN32)
                set(_NodeJS_HOME "$ENV{USERPROFILE}")
            else()
                set(_NodeJS_HOME "$ENV{HOME}")
            endif()
            
            if(_NodeJS_HOME)
                message(STATUS "Checking for node headers in ${_NodeJS_HOME}/.node-gyp/${NodeJS_VERSION}/include/node")
                set(_NodeJS_INCLUDE_DIR "${_NodeJS_HOME}/.node-gyp/${NodeJS_VERSION}/include/node")
                
                # Verify if this directory actually exists
                if(NOT EXISTS "${_NodeJS_INCLUDE_DIR}")
                    unset(_NodeJS_INCLUDE_DIR)
                endif()
            endif()
        endif()
    endif()
    
    # Method 3: Try using NPM root to locate headers
    if(NOT _NodeJS_INCLUDE_DIR)
        execute_process(
            COMMAND npm root -g
            OUTPUT_VARIABLE _NodeJS_NPM_GLOBAL_ROOT
            ERROR_QUIET
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        
        if(_NodeJS_NPM_GLOBAL_ROOT)
            find_path(_NodeJS_INCLUDE_DIR
                NAMES node.h
                PATHS 
                    "${_NodeJS_NPM_GLOBAL_ROOT}/node-addon-api/external-napi"
                    "${_NodeJS_NPM_GLOBAL_ROOT}/node/include"
                    "${_NodeJS_NPM_GLOBAL_ROOT}/nodejs/include"
                NO_DEFAULT_PATH
            )
        endif()
    endif()
    
    # Method 4: Try common system paths
    if(NOT _NodeJS_INCLUDE_DIR)
        find_path(_NodeJS_INCLUDE_DIR
            NAMES node.h
            PATHS
                /usr/include/node
                /usr/local/include/node
                /usr/include/nodejs
                /usr/local/include/nodejs
                /opt/include/node
        )
    endif()
    
    # Method 5: Ask node for its executable path and look for headers nearby
    if(NOT _NodeJS_INCLUDE_DIR)
        execute_process(
            COMMAND ${NodeJS_EXECUTABLE} -e "console.log(process.execPath)"
            OUTPUT_VARIABLE _NodeJS_EXEC_PATH
            ERROR_QUIET
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
        
        if(_NodeJS_EXEC_PATH)
            get_filename_component(_NodeJS_EXEC_DIR "${_NodeJS_EXEC_PATH}" DIRECTORY)
            
            find_path(_NodeJS_INCLUDE_DIR
                NAMES node.h
                PATHS
                    "${_NodeJS_EXEC_DIR}/../include/node"
                    "${_NodeJS_EXEC_DIR}/../include"
                NO_DEFAULT_PATH
            )
        endif()
    endif()
    
    # Method 6: Try installing node headers if not found and npm is available
    if(NOT _NodeJS_INCLUDE_DIR)
        find_program(NPM_EXECUTABLE NAMES npm)
        
        if(NPM_EXECUTABLE)
            message(STATUS "Node.js headers not found. Attempting to install node-addon-api package...")
            
            # Create a temporary directory for installation
            set(_NodeJS_TEMP_DIR "${CMAKE_BINARY_DIR}/node-addon-temp")
            file(MAKE_DIRECTORY "${_NodeJS_TEMP_DIR}")
            
            # Create a minimal package.json
            file(WRITE "${_NodeJS_TEMP_DIR}/package.json" "{ \"name\": \"temp\", \"version\": \"1.0.0\" }")
            
            # Install node-addon-api in this temporary directory
            execute_process(
                COMMAND ${NPM_EXECUTABLE} install node-addon-api
                WORKING_DIRECTORY "${_NodeJS_TEMP_DIR}"
                OUTPUT_QUIET
                ERROR_QUIET
            )
            
            # Try to get the include path from the installed package
            execute_process(
                COMMAND ${NodeJS_EXECUTABLE} -e "try { console.log(require('node-addon-api').include) } catch(e) {}"
                WORKING_DIRECTORY "${_NodeJS_TEMP_DIR}"
                OUTPUT_VARIABLE _NodeJS_INCLUDE_DIR
                ERROR_QUIET
                OUTPUT_STRIP_TRAILING_WHITESPACE
            )
            
            # Additional search path for node.h
            find_path(__NodeJS_EXTRA_INCLUDE_DIR
                NAMES node.h
                PATHS "${_NodeJS_TEMP_DIR}/node_modules/node-addon-api/external-napi"
                NO_DEFAULT_PATH
            )
            
            if(__NodeJS_EXTRA_INCLUDE_DIR)
                set(_NodeJS_INCLUDE_DIR "${__NodeJS_EXTRA_INCLUDE_DIR}")
            endif()
        endif()
    endif()
    
    # Final check and assignment of include dirs
    if(_NodeJS_INCLUDE_DIR)
        message(STATUS "Found Node.js include directory: ${_NodeJS_INCLUDE_DIR}")
        set(NodeJS_INCLUDE_DIRS ${_NodeJS_INCLUDE_DIR})
    else()
        message(WARNING "Node.js include directory not found! Setup custom installation?")
        set(NodeJS_INCLUDE_DIRS "/usr/include/node")  # Set a default value to continue building
        message(STATUS "Using fallback include directory: ${NodeJS_INCLUDE_DIRS}")
        message(STATUS "If this path is incorrect, specify manually with -DNodeJS_INCLUDE_DIRS_MANUAL=/path/to/node/headers")
    endif()
    
    # Check for manually specified include dirs
    if(DEFINED NodeJS_INCLUDE_DIRS_MANUAL)
        message(STATUS "Using manually specified Node.js include dirs: ${NodeJS_INCLUDE_DIRS_MANUAL}")
        set(NodeJS_INCLUDE_DIRS "${NodeJS_INCLUDE_DIRS_MANUAL}")
    endif()
endif()

# Handle standard find_package arguments
include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(NodeJS
    REQUIRED_VARS NodeJS_EXECUTABLE NodeJS_INCLUDE_DIRS
    VERSION_VAR NodeJS_VERSION
)

# Create imported target if not already defined
if(NodeJS_FOUND AND NOT TARGET NodeJS::NodeJS)
    add_library(NodeJS::NodeJS INTERFACE IMPORTED)
    set_target_properties(NodeJS::NodeJS PROPERTIES
        INTERFACE_INCLUDE_DIRECTORIES "${NodeJS_INCLUDE_DIRS}"
    )
endif()
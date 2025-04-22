# FindCURL.cmake
# Custom find module for libcurl with WSL support

# Try to find curl with pkg-config first
find_package(PkgConfig QUIET)
if(PKG_CONFIG_FOUND)
  pkg_check_modules(PC_CURL QUIET libcurl)
endif()

# Find curl-config executable
find_program(CURL_CONFIG_EXECUTABLE NAMES curl-config)
if(CURL_CONFIG_EXECUTABLE)
  execute_process(
    COMMAND ${CURL_CONFIG_EXECUTABLE} --version
    OUTPUT_VARIABLE CURL_VERSION_STRING
    OUTPUT_STRIP_TRAILING_WHITESPACE)
    
  execute_process(
    COMMAND ${CURL_CONFIG_EXECUTABLE} --cflags
    OUTPUT_VARIABLE _CURL_CFLAGS
    OUTPUT_STRIP_TRAILING_WHITESPACE)
    
  execute_process(
    COMMAND ${CURL_CONFIG_EXECUTABLE} --libs
    OUTPUT_VARIABLE _CURL_LIBS
    OUTPUT_STRIP_TRAILING_WHITESPACE)
    
  # Extract include dirs from cflags
  string(REGEX MATCHALL "-I[^ ]+" _CURL_INCLUDE_DIRS "${_CURL_CFLAGS}")
  string(REPLACE "-I" "" _CURL_INCLUDE_DIRS "${_CURL_INCLUDE_DIRS}")
  
  if(_CURL_INCLUDE_DIRS)
    set(CURL_INCLUDE_DIR ${_CURL_INCLUDE_DIRS})
  endif()
endif()

# Try to find curl include directory if not found through curl-config
if(NOT DEFINED CURL_INCLUDE_DIR)
  find_path(CURL_INCLUDE_DIR NAMES curl/curl.h
    PATHS
      ${PC_CURL_INCLUDEDIR}
      ${PC_CURL_INCLUDE_DIRS}
      /usr/include
      /usr/local/include
      /opt/local/include
      /opt/curl/include
      /usr/include/x86_64-linux-gnu  # Debian/Ubuntu multiarch
      # WSL paths
      /mnt/c/Program Files/curl/include
      /mnt/c/curl/include
      /mnt/c/libraries/curl/include
    PATH_SUFFIXES curl
  )
endif()

# Try to find curl library if not found through curl-config
if(NOT DEFINED CURL_LIBRARY)
  find_library(CURL_LIBRARY NAMES curl libcurl
    PATHS
      ${PC_CURL_LIBDIR}
      ${PC_CURL_LIBRARY_DIRS}
      /usr/lib
      /usr/local/lib
      /opt/local/lib
      /opt/curl/lib
      /usr/lib/x86_64-linux-gnu  # Debian/Ubuntu multiarch
      # WSL paths
      /mnt/c/Program Files/curl/lib
      /mnt/c/curl/lib
      /mnt/c/libraries/curl/lib
  )
endif()

if(CURL_LIBRARY)
  set(CURL_LIBRARIES ${CURL_LIBRARY})
endif()

# WSL installation check
if(NOT CURL_INCLUDE_DIR OR NOT CURL_LIBRARIES)
  # Check if we're in WSL
  execute_process(
    COMMAND grep -q Microsoft /proc/version
    RESULT_VARIABLE NOT_WSL
    OUTPUT_QUIET
    ERROR_QUIET
  )
  
  if(NOT_WSL EQUAL 0)
    message(STATUS "Running in WSL environment. libcurl not found.")
    message(STATUS "To install libcurl in WSL: sudo apt-get update && sudo apt-get install -y libcurl4-openssl-dev")
    
    # Option to try automatic installation
    option(AUTO_INSTALL_CURL "Automatically try to install libcurl4-openssl-dev" OFF)
    if(AUTO_INSTALL_CURL)
      message(STATUS "Attempting to install libcurl4-openssl-dev...")
      
      execute_process(
        COMMAND sudo apt-get update
        RESULT_VARIABLE UPDATE_RESULT
      )
      
      if(UPDATE_RESULT EQUAL 0)
        execute_process(
          COMMAND sudo apt-get install -y libcurl4-openssl-dev
          RESULT_VARIABLE INSTALL_RESULT
        )
        
        if(INSTALL_RESULT EQUAL 0)
          message(STATUS "libcurl4-openssl-dev installed. Retrying detection...")
          
          # Try again to find curl
          unset(CURL_INCLUDE_DIR CACHE)
          unset(CURL_LIBRARY CACHE)
          
          find_path(CURL_INCLUDE_DIR NAMES curl/curl.h)
          find_library(CURL_LIBRARY NAMES curl)
          
          if(CURL_LIBRARY)
            set(CURL_LIBRARIES ${CURL_LIBRARY})
          endif()
        else()
          message(WARNING "Failed to install libcurl4-openssl-dev. Please install manually.")
        endif()
      else()
        message(WARNING "Failed to update package repositories. Please install libcurl4-openssl-dev manually.")
      endif()
    endif()
  endif()
endif()

# For compatibility with Find modules
if(CURL_INCLUDE_DIR AND EXISTS "${CURL_INCLUDE_DIR}/curl/curl.h")
  # Extract version from curl.h if we haven't got it from curl-config
  if(NOT DEFINED CURL_VERSION_STRING)
    file(STRINGS "${CURL_INCLUDE_DIR}/curl/curlver.h" curl_version_str REGEX "^#define[\t ]+LIBCURL_VERSION[\t ]+\".*\"")
    
    if(curl_version_str)
      string(REGEX REPLACE "^#define[\t ]+LIBCURL_VERSION[\t ]+\"([^\"]*)\".*" "\\1" CURL_VERSION_STRING "${curl_version_str}")
    else()
      # Try alternative version defines
      file(STRINGS "${CURL_INCLUDE_DIR}/curl/curlver.h" curl_version_str REGEX "^#define[\t ]+LIBCURL_VERSION_NUM[\t ]+.*")
      set(CURL_VERSION_STRING "unknown")
    endif()
  endif()
endif()

# Debug output
if(CURL_INCLUDE_DIR)
  message(STATUS "Found CURL include dir: ${CURL_INCLUDE_DIR}")
else()
  message(STATUS "CURL include dir not found!")
endif()

if(CURL_LIBRARIES)
  message(STATUS "Found CURL libraries: ${CURL_LIBRARIES}")
else()
  message(STATUS "CURL libraries not found!")
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(CURL
  REQUIRED_VARS CURL_LIBRARIES CURL_INCLUDE_DIR
  VERSION_VAR CURL_VERSION_STRING
)

mark_as_advanced(CURL_INCLUDE_DIR CURL_LIBRARY)

# Create imported target
if(CURL_FOUND AND NOT TARGET CURL::libcurl)
  add_library(CURL::libcurl UNKNOWN IMPORTED)
  set_target_properties(CURL::libcurl PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CURL_INCLUDE_DIR}"
    IMPORTED_LOCATION "${CURL_LIBRARIES}"
  )
endif()
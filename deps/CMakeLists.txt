# CMakeLists.txt for dependencies

cmake_minimum_required(VERSION 3.15)

# Always use position independent code
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Check if submodules are initialized
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/libtommath/CMakeLists.txt")
  message(WARNING "The git submodules were not initialized. Please run: git submodule update --init --recursive")
endif()

# Add the libtommath library
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/libtommath/CMakeLists.txt")
  add_subdirectory(libtommath)
  
  # Create an alias target for compatibility with different naming conventions
  if(TARGET tommath AND NOT TARGET libtommath)
    add_library(libtommath ALIAS tommath)
  endif()
else()
  message(FATAL_ERROR "libtommath submodule not found. Please run: git submodule update --init --recursive")
endif()

# Configure cURL
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/curl/CMakeLists.txt")
  # Add cURL build options with absolute minimal dependencies
  option(BUILD_CURL_EXE "Build curl executable" OFF)
  option(ENABLE_MANUAL "Enable man page generation" OFF)
  option(HTTP_ONLY "Only enable HTTP protocol" ON)
  option(CURL_CA_PATH_EMBEDDED "Use embedded CA certificates" ON)
  option(CURL_USE_OPENSSL "Enable OpenSSL" OFF)
  option(CURL_USE_LIBSSH2 "Enable libSSH2" OFF)
  option(CURL_USE_LIBPSL "Enable libPSL" OFF)
  option(CURL_ZLIB "Enable zlib support" OFF)
  option(USE_NGHTTP2 "Enable nghttp2 support" OFF)
  option(CURL_BROTLI "Enable brotli support" OFF)
  option(CURL_ZSTD "Enable zstd support" OFF)
  
  # Windows-specific settings
  if(WIN32)
    # Use static libraries on Windows to avoid DLL issues
    option(BUILD_SHARED_LIBS "Build shared libraries" OFF)
    
    # Add Windows-specific compiler flags
    add_compile_definitions(
      CURL_STATICLIB
      BUILDING_LIBCURL
      _WIN32_WINNT=0x0600
    )
  else()
    # Use shared libraries on non-Windows platforms
    option(BUILD_SHARED_LIBS "Build shared libraries" ON)
  endif()
  
  # Disable all optional features to avoid dependency issues
  option(CURL_DISABLE_ALTSVC "Disable alt-svc support" ON)
  option(CURL_DISABLE_COOKIES "Disable cookies support" ON)
  option(CURL_DISABLE_CRYPTO_AUTH "Disable cryptographic authentication" ON)
  option(CURL_DISABLE_DICT "Disable DICT support" ON)
  option(CURL_DISABLE_FILE "Disable FILE support" ON)
  option(CURL_DISABLE_FTP "Disable FTP support" ON)
  option(CURL_DISABLE_GOPHER "Disable Gopher support" ON)
  option(CURL_DISABLE_HSTS "Disable HSTS support" ON)
  option(CURL_DISABLE_HTTP_AUTH "Disable HTTP authentication support" ON)
  option(CURL_DISABLE_IMAP "Disable IMAP support" ON)
  option(CURL_DISABLE_LDAP "Disable LDAP support" ON)
  option(CURL_DISABLE_LDAPS "Disable LDAPS support" ON)
  option(CURL_DISABLE_LIBCURL_OPTION "Disable libcurl options" ON)
  option(CURL_DISABLE_MIME "Disable MIME support" ON)
  option(CURL_DISABLE_MQTT "Disable MQTT support" ON)
  option(CURL_DISABLE_NETRC "Disable netrc parser" ON)
  option(CURL_DISABLE_POP3 "Disable POP3 support" ON)
  option(CURL_DISABLE_PROGRESS_METER "Disable progress meter" ON)
  option(CURL_DISABLE_PROXY "Disable proxy support" ON)
  option(CURL_DISABLE_RTSP "Disable RTSP support" ON)
  option(CURL_DISABLE_SHUFFLE_DNS "Disable shuffle DNS" ON)
  option(CURL_DISABLE_SMB "Disable SMB support" ON)
  option(CURL_DISABLE_SMTP "Disable SMTP support" ON)
  option(CURL_DISABLE_SOCKETPAIR "Disable socketpair connection" ON)
  option(CURL_DISABLE_TELNET "Disable telnet support" ON)
  option(CURL_DISABLE_TFTP "Disable TFTP support" ON)
  option(CURL_DISABLE_VERBOSE_STRINGS "Disable verbose strings" ON)
  
  # Add the curl library
  add_subdirectory(curl)
  
  # Create curl include directories interface
  if(NOT TARGET curl_interface)
    add_library(curl_interface INTERFACE)
    target_include_directories(curl_interface INTERFACE 
      "${CMAKE_CURRENT_SOURCE_DIR}/curl/include"
    )
  endif()
else()
  message(FATAL_ERROR "curl submodule not found. Please run: git submodule update --init --recursive")
endif()

message(STATUS "Configured dependencies")
{
  "targets": [
    {
      "target_name": "aggregator",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "cflags": [
        "-O3",
        "-Wall",
        "-Wextra"
      ],
      "sources": [
        "src/binding.cpp",
        "aggregator.c",
        "bigint_ops.c",
        "../common/bigint_lib/bigint.c"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/../src/libtommath/windows/include",
        "<(module_root_dir)/../src/libtommath/linux/include"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NODE_ADDON_API_DISABLE_DEPRECATED"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "<(module_root_dir)/../src/libtommath/windows/shared/libtommath.dll.a",
            "legacy_stdio_definitions.lib",
            "libucrt.lib",
            "libvcruntime.lib",
            "libcmt.lib",
            "oldnames.lib"
          ],
          "copies": [
            {
              "destination": "<(PRODUCT_DIR)",
              "files": ["<(module_root_dir)/../src/libtommath/windows/shared/libtommath.dll"]
            }
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "RuntimeLibrary": 0,
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/MT", "/utf-8", "/GS-"]
            },
            "VCLinkerTool": {
              "AdditionalLibraryDirectories": [
                "<(module_root_dir)/../src/libtommath/windows/shared"
              ],
              "AdditionalDependencies": [
                "legacy_stdio_definitions.lib",
                "libucrt.lib",
                "libvcruntime.lib",
                "libcmt.lib",
                "oldnames.lib"
              ],
              "GenerateDebugInformation": "true"
            }
          }
        }],
        ["OS!='win'", {
          "libraries": [ "<(module_root_dir)/../src/libtommath/linux/static/libtommath.a" ]
        }]
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15"
      }
    }
  ]
}
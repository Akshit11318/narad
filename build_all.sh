#!/bin/bash

# Create directories for different platforms
mkdir -p build/{windows,linux,macos}

# Linux Build - Static Library
echo "Building Linux Static Library..."
cd build/linux
mkdir -p static
cd static
cmake ../../.. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DCMAKE_INSTALL_PREFIX=$(pwd)/install
make -j$(nproc)
make install

# Linux Build - Shared Library
echo "Building Linux Shared Library..."
cd ..
mkdir -p shared
cd shared
cmake ../../.. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=ON \
    -DCMAKE_INSTALL_PREFIX=$(pwd)/install
make -j$(nproc)
make install

# Windows Build - Static Library
echo "Building Windows Static Library..."
cd ../../windows
mkdir -p static
cd static
cmake ../../.. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DCMAKE_INSTALL_PREFIX=$(pwd)/install \
    -DCMAKE_TOOLCHAIN_FILE=../../../cmake/mingw-w64-x86_64.cmake
make -j$(nproc)
make install

# Windows Build - Shared Library
echo "Building Windows Shared Library..."
cd ..
mkdir -p shared
cd shared
cmake ../../.. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=ON \
    -DCMAKE_INSTALL_PREFIX=$(pwd)/install \
    -DCMAKE_TOOLCHAIN_FILE=../../../cmake/mingw-w64-x86_64.cmake
make -j$(nproc)
make install

cd ../../..

echo "Build completed!"
echo "Libraries can be found in:"
echo "Linux static:  build/linux/static/install/lib"
echo "Linux shared:  build/linux/shared/install/lib"
echo "Windows static: build/windows/static/install/lib"
echo "Windows shared: build/windows/shared/install/lib"


# ... existing build commands ...

# Create organized structure in src folder
echo "Organizing files in src folder..."
mkdir -p ../src/dependencies/libtommath/{windows,linux}/include
mkdir -p ../src/dependencies/libtommath/{windows,linux}/{static,shared}

# Copy Linux files
cp build/linux/static/libtommath.a ../src/dependencies/libtommath/linux/static/
cp build/linux/shared/libtommath.so* ../src/dependencies/libtommath/linux/shared/
cp build/linux/shared/install/include/*.h ../src/dependencies/libtommath/linux/include/

# Copy Windows files
cp build/windows/static/libtommath.a ../src/dependencies/libtommath/windows/static/
cp build/windows/shared/libtommath.dll ../src/dependencies/libtommath/windows/shared/
cp build/windows/shared/libtommath.dll.a ../src/dependencies/libtommath/windows/shared/
cp build/windows/shared/install/include/*.h ../src/dependencies/libtommath/windows/include/

echo "Build completed!"
echo "Libraries organized in: ../src/dependencies/libtommath/"
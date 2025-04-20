#ifndef LIBTOMMATH_WRAPPER_H
#define LIBTOMMATH_WRAPPER_H

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32)
#include "../../../src/libtommath/windows/include/tommath.h"
#else
#include "../../../src/libtommath/linux/include/tommath.h"
#endif

// Add any helper functions or macros here that make libtommath easier to use
// with your specific project needs

#ifdef __cplusplus
}
#endif

#endif // LIBTOMMATH_WRAPPER_H
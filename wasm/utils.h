#ifndef UTILS_H
#define UTILS_H

#define STB_SPRINTF_IMPLEMENTATION 1
#include <limits.h>

#include "./vendor/stb_sprintf.h"

typedef unsigned char      u8;
typedef unsigned short     u16;
typedef unsigned int       u32;
typedef unsigned long long u64;

typedef char      s8;
typedef short     s16;
typedef int       s32;
typedef long long s64;

typedef float f32;

typedef __SIZE_TYPE__ size_t;
#if defined(__LP64__) || defined(_WIN64)
typedef s64 ssize_t;
#else
typedef s32 ssize_t;
#endif

typedef u64 time_t;

#define JS_FN(name) __attribute__((import_module("env"))) __attribute__((import_name(name))) extern
#define EXPORT(name) __attribute__((export_name(name)))

#define ARRAY_LEN(x) (sizeof(x) / sizeof(x[0]))

#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)
#define ASSERT_STACKTRACE(x) __FILE__ "(" STR(__LINE__) "): Assertion failed for '" #x "'"

#define assert(x, ...)                                               \
    do                                                               \
    {                                                                \
        if (x)                                                       \
        {                                                            \
        }                                                            \
        else                                                         \
        {                                                            \
            char output[] = (ASSERT_STACKTRACE(x) "\n" __VA_ARGS__); \
            write(1, output, sizeof(output));                        \
            exit(1);                                                 \
        }                                                            \
    } while (0)

void *memset(void *ptr, int value, size_t num)
{
    u8 *p = (u8 *)ptr;
    while (num--)
    {
        *p++ = (u8)value;
    }
    return ptr;
}

void *memcpy(void *dest, const void *source, size_t num)
{
    u8       *d = (u8 *)dest;
    const u8 *s = (const u8 *)source;
    while (num--)
    {
        *d++ = *s++;
    }
    return dest;
}

int memcmp(const void *ptr1, const void *ptr2, size_t num)
{
    const u8 *p1 = (const u8 *)ptr1;
    const u8 *p2 = (const u8 *)ptr2;
    while (num--)
    {
        if (*p1 != *p2)
        {
            return (*p1 > *p2) ? 1 : -1;
        }
        p1++;
        p2++;
    }
    return 0;
}

size_t strlen(const char *str)
{
    const char *s = str;
    while (*s)
    {
        s++;
    }
    return (size_t)(s - str);
}

JS_FN("exit")
void exit(int);
JS_FN("breakpoint")
void breakpoint();
JS_FN("monotonic_time")
f32 monotonic_time();
JS_FN("time")
time_t time(time_t *);
JS_FN("time_ms")
time_t time_ms(time_t *);
JS_FN("read")
ssize_t read(int fd, void *buf, size_t count);
JS_FN("write")
ssize_t write(int fd, const void *buf, size_t count);

int printf(const char *fmt, ...)
{
    // TODO figure out a better way
    char    output[4096];
    va_list args;
    va_start(args, fmt);
    int actual_length = stbsp_vsnprintf(output, sizeof(output), fmt, args);
    va_end(args);
    write(1, output, actual_length);
    return actual_length;
}

#define iota(out, n)                   \
    do                                 \
    {                                  \
        for (size_t i = 0; i < n; i++) \
        {                              \
            out[i] = i;                \
        }                              \
    } while (0)

int strcmp(const char *s1, const char *s2)
{
    while (*s1 && (*s1 == *s2))
    {
        s1++;
        s2++;
    }
    return *(unsigned char *)s1 - *(unsigned char *)s2;
}

char *strncat(char *ptr, const char *src, size_t n)
{
    while (*ptr)
    {
        ptr++;
    }

    while (*src && n > 0)
    {
        *ptr++ = *src++;
        n--;
    }

    *ptr = '\0';

    return ptr;
}

void *malloc(size_t size);
void  free(void *p);

EXPORT("walloc")
void *walloc(size_t size)
{
    return malloc(size);
}

EXPORT("wfree")
void wfree(void *p)
{
    free(p);
}

typedef struct
{
    u64 state;
} pcg32_t;

static u64 const pcg_multiplier = 6364136223846793005u;
static u64 const pcg_increment  = 1442695040888963407u;

u32 pcg32(pcg32_t *state)
{
    u64      x     = state->state;
    unsigned count = (unsigned)(x >> 59);
    state->state   = x * pcg_multiplier + pcg_increment;
    x ^= x >> 18;
    u32 x32 = x >> 27;
    return x32 >> count | x32 << (-count & 31);
}

pcg32_t pcg32_init(u64 seed)
{
    pcg32_t state = {seed + pcg_increment};
    (void)pcg32(&state);
    return state;
}

#define RAND_MAX INT_MAX

pcg32_t rand_state = {1llu};
int     rand()
{
    u32 random_value = pcg32(&rand_state);

    return (int)(random_value & INT_MAX);
}

void srand(unsigned seed)
{
    rand_state = pcg32_init(seed);
}

JS_FN("check_img_response")
s32 check_img_response(s32 key, f32 *width, f32 *height, u8 **out);

JS_FN("send_img_request")
s32 send_img_request(const char *file, void (*fn)(s32));

f32 clampf(f32 value, f32 min, f32 max)
{
    if (value < min)
    {
        return min;
    }
    if (value > max)
    {
        return max;
    }
    return value;
}

#endif

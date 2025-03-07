#ifndef MATH_H_
#define MATH_H_

#include "./utils.h"

#define PI 3.14159265358979323846f
#define TAU (PI * 2.0f)
#define INFINITY __builtin_inff()

JS_FN("sinf")
f32 sinf(f32 f);
JS_FN("cosf")
f32 cosf(f32 f);
JS_FN("sqrtf")
f32 sqrtf(f32 f);

static inline f32 fminf(f32 a, f32 b)
{
    return a < b ? a : b;
}
static inline f32 fmaxf(f32 a, f32 b)
{
    return a > b ? a : b;
}

typedef struct
{
    f32 x;
    f32 y;
} Vec2;

#define printf_vec2(str, vec) printf(str ": {%f, %f}", (vec).x, (vec).y);


static inline Vec2 vec2(f32 x, f32 y)
{
    return (Vec2){x, y};
}

static inline Vec2 vec2f(f32 x)
{
    return (Vec2){x, x};
}

static inline Vec2 vec2_zero(void)
{
    return (Vec2){0, 0};
}

static inline Vec2 vec2_one(void)
{
    return (Vec2){1, 1};
}

static inline Vec2 vec2_add(Vec2 a, Vec2 b)
{
    return (Vec2){a.x + b.x, a.y + b.y};
}

static inline Vec2 vec2_sub(Vec2 a, Vec2 b)
{
    return (Vec2){a.x - b.x, a.y - b.y};
}

static inline Vec2 vec2_mul(Vec2 a, f32 scalar)
{
    return (Vec2){a.x * scalar, a.y * scalar};
}

static inline Vec2 vec2_div(Vec2 a, f32 scalar)
{
    return (Vec2){a.x / scalar, a.y / scalar};
}

static inline Vec2 vec2_neg(Vec2 a)
{
    return (Vec2){-a.x, -a.y};
}

static inline f32 vec2_dot(Vec2 a, Vec2 b)
{
    return a.x * b.x + a.y * b.y;
}

static inline f32 vec2_cross(Vec2 a, Vec2 b)
{
    return a.x * b.y - a.y * b.x;
}

static inline f32 vec2_length_sq(Vec2 a)
{
    return a.x * a.x + a.y * a.y;
}

static inline f32 vec2_length(Vec2 a)
{
    return sqrtf(vec2_length_sq(a));
}

static inline Vec2 vec2_normalize(Vec2 a)
{
    f32 len = vec2_length(a);
    return len > 0 ? vec2_div(a, len) : vec2_zero();
}

typedef struct
{
    union
    {
        struct
        {
            f32 x, y, z, w;
        };
        struct
        {
            f32 r, g, b, a;
        };
        f32 array[4];
    };
} Vec4;

static inline Vec2 rect_center_child(Vec2 parent, Vec2 child)
{
    return vec2_sub(vec2_div(parent, 2.0f), vec2_div(child, 2.0f));
}

// Use the position and size to find the center of an entity
static inline Vec2 rect_calculate_center(Vec2 position, Vec2 size)
{
    return vec2_add(position, vec2_div(size, 2.0f));
}

// Given the center of an entity, calculate it's position
static inline Vec2 rect_calculate_position_from_center(Vec2 center, Vec2 size)
{
    return vec2_sub(center, vec2_div(size, 2.0f));
}

#endif  // MATH_H_

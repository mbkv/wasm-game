#ifndef SHAPE_GENERATORS_H_
#define SHAPE_GENERATORS_H_

#include "./math.h"
#include "./utils.h"

Vec2 circle_point_generate(int n, int i, f32 radius)
{
    f32  angle       = TAU / n * i;
    Vec2 unit_circle = vec2(cosf(angle), sinf(angle));

    return vec2_mul(unit_circle, radius);
}

void circle_generate(Vec2 *out, int n, Vec2 position, f32 radius)
{
    for (int i = 0; i < n; i++)
    {
        out[i] = vec2_add(position, circle_point_generate(n, i, radius));
    }
}

void rounded_rect_generate(Vec2 *out, int n, Vec2 position, Vec2 size, f32 radius)
{
    assert(n % 4 == 0,
           "Expecting rounded_rect_generate to be a multiplier of 4 "
           "to make the logic easier");
    radius = fminf(radius, fminf(size.x / 2, size.y / 2));

    Vec2 rectangle_corners[4] = {
        vec2_add(position, vec2(size.x - radius, -radius)),
        vec2_add(position, vec2(radius, -radius)),
        vec2_add(position, vec2(radius, -size.y + radius)),
        vec2_add(position, vec2(size.x - radius, -size.y + radius)),
    };

    int arc_quality = n / 4;

    for (int i = 0; i < n; i++)
    {
        int corner_idx = (i / arc_quality);
        out[i]         = vec2_add(rectangle_corners[corner_idx],
                                  circle_point_generate(n - 4, i - corner_idx, radius));
    }
}

#endif  // SHAPE_GENERATORS_H_

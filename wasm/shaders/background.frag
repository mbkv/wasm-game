#version 300 es
precision mediump float;

uniform uint u_seed;
uniform float u_time;
uniform float u_scaling;

in vec2 fragCoord;

out vec4 fragColor;

uint hash_vec2(uvec2 p)
{
    p = 1103515245U*((p >> 1U)^(p.yx));
    uint h32 = 1103515245U*((p.x)^(p.y>>3U));
    return h32^(h32 >> 16);
}

uint hash_uint(uint x)
{
    x ^= x >> 16;
    x *= 0x7feb352dU;
    x ^= x >> 15;
    x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

float rand_vec2(vec2 inp)
{
    uint hashed = hash_vec2(uvec2(inp));
    float rand = float(hashed ^ u_seed) / float(0xffffffffU);
    return rand;
}

float rand_uint(uint inp) 
{
    uint hashed = hash_uint(inp);
    float rand = float(hashed ^ u_seed) / float(0xffffffffU);
    return rand;
}

vec3 kelvinToRGB(float kelvin) {
    kelvin = kelvin / 100.0;

    vec3 color;

    // Red
    if (kelvin <= 66.0) {
        color.r = 1.0;
    } else {
        float r = kelvin - 60.0;
        color.r = 329.698727446 * pow(r, -0.1332047592);
        color.r = clamp(color.r, 0.0, 255.0) / 255.0;
    }

    // Green
    if (kelvin <= 66.0) {
        color.g = 99.4708025861 * log(kelvin) - 161.1195681661;
    } else {
        float g = kelvin - 60.0;
        color.g = 288.1221695283 * pow(g, -0.0755148492);
    }
    color.g = clamp(color.g, 0.0, 255.0) / 255.0;

    // Blue
    if (kelvin >= 66.0) {
        color.b = 1.0;
    } else if (kelvin <= 19.0) {
        color.b = 0.0;
    } else {
        float b = kelvin - 10.0;
        color.b = 138.5177312231 * log(b) - 305.0447927307;
        color.b = clamp(color.b, 0.0, 255.0) / 255.0;
    }

    return color;
}

void main() {
    vec3 color = vec3(0.0);
    float target = 0.999;

    int i = 4;
    while (i-- != 0) {
        vec2 uv = (fragCoord.xy) / (.25 * u_scaling);
        uv += 2000.0;
        uv.y = uv.y + u_time * 2.0 * float(i + 5);
        uv = floor(uv);
        float rand = rand_vec2(vec2(uv.x + float(i * 5000), uv.y));

        if (rand > target) {
            float temperature_rand = rand_vec2(uv * vec2(float(i + 1) * 7331.0)); 
            float temperature = mix(3500.0, 12000.0, temperature_rand);
            color = kelvinToRGB(temperature);

            float brightness = rand_vec2(uv * vec2(float(i + 1) * 1337.0)); 
            color *= mix(0.3, 1.0, brightness);

            float flicker_offset = rand_vec2(uv * vec2(float(i + 1) * 1234.56789) );
            float flicker_time = rand_vec2(uv * vec2(float(i + 1) * 9876.54321));
            float flicker = abs(sin(u_time * flicker_time * 2.5 + flicker_offset * 6.28318));
            color *= mix(0.1, 1.0, pow(flicker, 0.2));
            break;
        }
    }


    fragColor = vec4(color.xyz, 1.0);
}

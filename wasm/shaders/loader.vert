#version 300 es

#define GAME_WIDTH 400
#define GAME_HEIGHT 500

layout(location = 0) in vec2 aPos;

uniform vec2 u_resolution;

out vec2 vFragCoord;
out vec4 vColor;

void main() {
    vec2 game_size = vec2(GAME_WIDTH, GAME_HEIGHT);
    vec2 adjustment = (u_resolution - game_size) / 2.0f;
    vec2 uv = ((aPos + adjustment) / u_resolution - 0.5) * 2.0;
    gl_Position = vec4(uv, 0.0, 1.0);
    vFragCoord = aPos;
}

#version 300 es

#define GAME_WIDTH 400
#define GAME_HEIGHT 500

layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aTextureCoord;

uniform vec2 u_resolution;
uniform vec2 u_position;
uniform vec2 u_size;

out vec2 vTextureCoord;


void main() {
    vec2 game_size = vec2(GAME_WIDTH, GAME_HEIGHT);
    vec2 adjustment = (u_resolution - game_size) / 2.0f;

    vec2 worldPos = u_position + aPos * u_size;
    vec2 uv = ((worldPos + adjustment) / u_resolution - 0.5) * 2.0;
    gl_Position = vec4(uv, 0.0, 1.0);

    vTextureCoord = aTextureCoord;
}

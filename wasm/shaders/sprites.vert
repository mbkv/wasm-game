#version 300 es

layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aTextureCoord;

uniform vec2 u_resolution;
uniform vec2 u_position;
uniform vec2 u_size;

out vec2 vTextureCoord;

void main() {
    vec2 worldPos = u_position + aPos * u_size;

    vec2 clipPos = (worldPos / u_resolution - 0.5) * 2.0;
    gl_Position = vec4(clipPos, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}

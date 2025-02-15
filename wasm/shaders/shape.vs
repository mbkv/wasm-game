#version 300 es

layout(location = 0) in vec2 aPos;
layout(location = 1) in vec4 aColor;

uniform vec2 u_resolution;

out vec4 vColor;

void main() {
    vec2 uv = (aPos / u_resolution - 0.5) * 2.0;
    gl_Position = vec4(uv, 0.0, 1.0);

    vColor = aColor;
}

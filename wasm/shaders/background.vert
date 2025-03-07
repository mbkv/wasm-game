#version 300 es
precision mediump float;

uniform vec2 u_resolution;

// Position attribute for the vertices of our quad
layout(location = 0) in vec2 a_position;

out vec2 fragCoord;

void main() {
    fragCoord = (u_resolution / 2.0) * a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
}

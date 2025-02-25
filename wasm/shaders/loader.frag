#version 300 es

precision mediump float;

uniform float u_percent;
uniform vec2 u_minmax_coord;
uniform vec4 u_color;

out vec4 FragColor;

void main() {
    float this_frag_percent = (gl_FragCoord.x - u_minmax_coord.x) / (u_minmax_coord.y - u_minmax_coord.x);
    if (this_frag_percent <= u_percent) {
        FragColor = u_color;
    } else {
        FragColor = vec4(0.0);
    }
}


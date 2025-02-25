#version 300 es

precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    // Sample the texture at the interpolated texture coordinate
    vec4 texColor = texture(u_texture, vTextureCoord);
    
    // Output the sampled color
    fragColor = texColor;
}

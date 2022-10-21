#version 300 es
#define MAX_NUM_TOTAL_LIGHTS 1

precision mediump float;

struct LightSource {
  vec3 reverseDirection;
  vec4 color;
};

in vec3 v_normal;
in vec2 v_texcoord;

uniform int u_lightCount;
uniform LightSource u_lightSources[MAX_NUM_TOTAL_LIGHTS];

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  outColor = texture(u_texture, v_texcoord);
  for (int i = 0; i < u_lightCount; i++) {
    float light = dot(normal, u_lightSources[i].reverseDirection);
    outColor.rgb *= light;
  }
}

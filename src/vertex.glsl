#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

out vec2 v_texcoord;
out vec3 v_normal;
void main() {
  gl_Position = u_worldViewProjection * a_position;
  v_texcoord = a_texcoord;
  v_normal = mat3(u_worldInverseTranspose) * a_normal;
}

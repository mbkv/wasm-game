#ifndef GL_UTILS_H
#define GL_UTILS_H

#include "./gl.h"
#include "utils.h"

typedef struct {
  GLuint vao;
  GLuint vbo;
  GLuint ibo;
} VAO;

void vao_setup(VAO *v) {
  glGenVertexArrays(1, &v->vao);
  glBindVertexArray(v->vao);
  GLuint buffers[2] = {0};
  glGenBuffers(2, buffers);
  v->vbo = buffers[0];
  v->ibo = buffers[1];
  glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
}

void vao_destroy(VAO *v) {
  GLuint buffers[2] = {
      v->vbo,
      v->ibo,
  };
  glDeleteBuffers(ARRAY_LEN(buffers), buffers);
  glDeleteVertexArray(v->vao);
}

#endif // GL_UTILS_H

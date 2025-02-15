#include "./gl.h"
#include "./gl_utils.h"
#include "./math.h"
#include "./utils.h"
#include "shape_generators.h"

char keyhandler_buffer[32];

JS_FN("onKeyDown")
void onKeyDown(char buffer[32], void (*handler)(void));

JS_FN("onKeyUp")
void onKeyUp(char buffer[32], void (*handler)(void));

JS_FN("onWindowResize")
void onWindowResize(void (*handler)(f32 width, f32 height));

JS_FN("requestAnimationFrameLoop")
void requestAnimationFrameLoop(void *(*frame_loop)(f32));

#define MAX_ENEMIES 50
#define MAX_BULLETS 30

Vec2 window_size = {0};
_Bool window_changed_this_frame = true;

typedef struct {
  GLuint program;
  VAO v;
  GLint time_uniform;
  GLint seed_uniform;
} BackgroundRenderer;

typedef struct {
  GLuint program;
} SpriteRenderer;

typedef struct {
  GLuint program;
} UIRenderer;

typedef struct {
  GLuint program;
  GLint resolution_uniform;
  GLint color_uniform;
  GLint percent_uniform;
  GLint minmax_coord_uniform;
} LoadingBarRenderer;

typedef struct {
  GLuint program;
  GLint resolution_uniform;
} ShapeRenderer;

typedef struct {
  GLuint id;
  Vec2 size;
} Texture;

typedef struct {
  BackgroundRenderer background;
  SpriteRenderer sprite;
  UIRenderer ui;
  LoadingBarRenderer loader;
  ShapeRenderer shapes;
} RenderSystem;

typedef struct {
  GLuint vao;
  GLuint vbo;
  Texture texture;
} Sprite;

typedef struct {
  Vec2 pos;
  Vec2 size;
  _Bool active;
} Entity;

typedef struct {
  Entity base;
  Sprite sprite;
  Sprite bullet;
  f32 last_fire;
  f32 speed;
} Player;

typedef struct {
  Sprite sprite;
  Vec2 size;
  f32 speed;
} EnemyType;

typedef struct {
  Entity base;
  s16 enemy_type;
} Enemy;

typedef struct {
  Entity base;
  f32 speed;
  f32 direction;
  s16 bullet_type;
} Bullet;

typedef struct {
  _Bool move_left;
  _Bool move_right;
  _Bool shoot;
  f32 movement_analog;
} Actions;

typedef struct {
  RenderSystem renderer;
  Actions actions;
  Player player;
  Enemy enemies[MAX_ENEMIES];
  Bullet bullets[MAX_BULLETS];
  Sprite bullet_types[10];
  EnemyType enemy_types[10];
  f32 delta_time;
  f32 game_time;
} GameState;

GameState game_state = {0};

void background_renderer_init(BackgroundRenderer *renderer) {
  vao_setup(&renderer->v);

  f32 background_verticies[] = {
      -1.0f, 1.0f, 1.0f, 1.0f, 1.0f, -1.0f, -1.0f, -1.0f,
  };
  glBufferData(GL_ARRAY_BUFFER, sizeof(background_verticies),
               &background_verticies, GL_STATIC_DRAW);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 2, GL_FLOAT, false, 0, 0);

  u16 indicies[] = {0, 1, 2, 0, 2, 3};
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indicies), indicies,
               GL_STATIC_DRAW);

  renderer->time_uniform = glGetUniformLocation(renderer->program, "u_time");
  renderer->seed_uniform = glGetUniformLocation(renderer->program, "u_seed");
}

void shape_renderer_init(ShapeRenderer *renderer) {
  renderer->resolution_uniform =
      glGetUniformLocation(renderer->program, "u_resolution");
}

typedef struct {
  Vec2 aPos;
  Vec4 aColor;
} ShapeRendererData;

void shape_renderer_setup_vao(ShapeRenderer *renderer, VAO *v,
                              ShapeRendererData *data, int n) {
  glBindVertexArray(v->vao);

  glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(ShapeRendererData) * n, data,
               GL_STATIC_DRAW);

  size_t indicies_bytes = sizeof(u16) * n;
  u16 *indicies = malloc(indicies_bytes);
  iota(indicies, n);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, indicies_bytes, indicies,
               GL_STATIC_DRAW);
  free(indicies);

  glEnableVertexAttribArray(0);
  glEnableVertexAttribArray(1);
  glVertexAttribPointer(0, 2, GL_FLOAT, false, sizeof(ShapeRendererData), 0);
  glVertexAttribPointer(1, 4, GL_FLOAT, false, sizeof(ShapeRendererData),
                        (void *)8);
}

void loader_renderer_init(LoadingBarRenderer *renderer) {
  renderer->resolution_uniform =
      glGetUniformLocation(renderer->program, "u_resolution");
  renderer->color_uniform = glGetUniformLocation(renderer->program, "u_color");
  renderer->minmax_coord_uniform =
      glGetUniformLocation(renderer->program, "u_minmax_coord");
  renderer->percent_uniform =
      glGetUniformLocation(renderer->program, "u_percent");
}

void loader_renderer_setup(LoadingBarRenderer *renderer, VAO *v, Vec2 *data,
                           int n) {
  glBindVertexArray(v->vao);
  glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(Vec2) * n, data, GL_STATIC_DRAW);

  size_t indicies_bytes = sizeof(u16) * n;
  u16 *indicies = malloc(indicies_bytes);
  iota(indicies, n);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, indicies_bytes, indicies,
               GL_STATIC_DRAW);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 2, GL_FLOAT, false, sizeof(Vec2), 0);

  free(indicies);
}

// void init_player(void);
// void init_enemies(void);
void init_graphics(void);
// void update_player(f32 dt);
// void update_enemies(f32 dt);
// void update_bullets(f32 dt);
// void check_collisions(void);
// _Bool check_collision(Entity a, Entity b);
// void spawn_bullet(void);
// void render_game(void);
//
GLuint compile_shader(const char *vs, const char *fs) {
  GLuint vs_shader = glCreateShader(GL_VERTEX_SHADER);
  glShaderSource(vs_shader, 1, &vs, NULL);
  glCompileShader(vs_shader);
  GLuint fs_shader = glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(fs_shader, 1, &fs, NULL);
  glCompileShader(fs_shader);
  GLuint program = glCreateProgram();

  glAttachShader(program, vs_shader);
  glAttachShader(program, fs_shader);
  glLinkProgram(program);

  GLint link_status;
  glGetProgramiv(program, GL_LINK_STATUS, &link_status);
  if (link_status != GL_TRUE) {
    GLchar log[1024];
    GLsizei log_length;

    glGetShaderInfoLog(vs_shader, sizeof(log), &log_length, log);
    if (log_length > 0) {
      printf("Vertex shader log:\n%s\n\nVertex shader source:\n%s", log, vs);
    }

    glGetShaderInfoLog(fs_shader, sizeof(log), &log_length, log);
    if (log_length > 0) {
      printf("Frag shader log:\n%s\n\nFrag shader source:\n%s", log, fs);
    }

    glGetProgramInfoLog(program, sizeof(log), &log_length, log);
    if (log_length > 0) {
      printf("Program log:\n%s", log);
    }

    glDeleteProgram(program);
    program = 0;
  }

  glDeleteShader(vs_shader);
  glDeleteShader(fs_shader);

  return program;
}

void init_graphics(void) {
  static const char sprites_vs_src[] = {
#embed "shaders/sprites.vs"
      , 0};
  static const char sprites_fs_src[] = {
#embed "shaders/sprites.fs"
      , 0};
  static const char background_vs_src[] = {
#embed "shaders/background.vs"
      , 0};
  static const char background_fs_src[] = {
#embed "shaders/background.fs"
      , 0};
  static const char ui_vs_src[] = {
#embed "shaders/ui.vs"
      , 0};
  static const char ui_fs_src[] = {
#embed "shaders/ui.fs"
      , 0};
  static const char loader_vs_src[] = {
#embed "shaders/loader.vs"
      , 0};
  static const char loader_fs_src[] = {
#embed "shaders/loader.fs"
      , 0};
  static const char shape_vs_src[] = {
#embed "shaders/shape.vs"
      , 0};
  static const char shape_fs_src[] = {
#embed "shaders/shape.fs"
      , 0};

  game_state.renderer.sprite.program =
      compile_shader(sprites_vs_src, sprites_fs_src);
  game_state.renderer.ui.program = compile_shader(ui_vs_src, ui_fs_src);
  game_state.renderer.loader.program =
      compile_shader(loader_vs_src, loader_fs_src);

  game_state.renderer.background.program =
      compile_shader(background_vs_src, background_fs_src);
  game_state.renderer.shapes.program =
      compile_shader(shape_vs_src, shape_fs_src);

  background_renderer_init(&game_state.renderer.background);
  shape_renderer_init(&game_state.renderer.shapes);
  loader_renderer_init(&game_state.renderer.loader);

  {
    glEnable(GL_BLEND);
    glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
  }
}
//
// void init_player(void) {
//   game_state.player.base.x = 0.0f;
//   game_state.player.base.y = -0.8f;
//   game_state.player.base.width = 0.1f;
//   game_state.player.base.height = 0.1f;
//   game_state.player.base.active = true;
//   game_state.player.speed = 1.0f;
// }
//
// void init_enemies(void) {
//   f32 x_start = -0.8f;
//   f32 y_start = 0.8f;
//   f32 x_spacing = 0.2f;
//   f32 y_spacing = 0.15f;
//
//   for (int i = 0; i < MAX_ENEMIES; i++) {
//     int row = i / 10;
//     int col = i % 10;
//
//     game_state.enemies[i].base.x = x_start + (col * x_spacing);
//     game_state.enemies[i].base.y = y_start - (row * y_spacing);
//     game_state.enemies[i].base.width = 0.08f;
//     game_state.enemies[i].base.height = 0.08f;
//     game_state.enemies[i].base.active = true;
//     game_state.enemies[i].speed = 0.5f;
//   }
// }
//
// void update_player(f32 dt) {
//   if (game_state.actions.move_left && game_state.player.base.x > -1.0f) {
//     game_state.player.base.x -= game_state.player.speed * dt;
//   }
//   if (game_state.actions.move_right && game_state.player.base.x < 1.0f) {
//     game_state.player.base.x += game_state.player.speed * dt;
//   }
//   f32 current_time = time();
//   f32 last_fire = game_state.player.last_fire;
//   f32 fire_rate = 0.25;
//   if (game_state.actions.shoot && current_time > last_fire + fire_rate) {
//     game_state.player.last_fire = current_time;
//     spawn_bullet();
//   }
// }
//
// void update_enemies(f32 dt) {
//   static f32 time_accumulated = 0.0f;
//   time_accumulated += dt;
//
//   for (int i = 0; i < MAX_ENEMIES; i++) {
//     if (!game_state.enemies[i].base.active)
//       continue;
//
//     game_state.enemies[i].base.x +=
//         sinf(time_accumulated * game_state.enemies[i].speed) * dt;
//   }
// }
//
// void update_bullets(f32 dt) {
//   for (int i = 0; i < MAX_BULLETS; i++) {
//     if (!game_state.bullets[i].base.active)
//       continue;
//
//     game_state.bullets[i].base.y +=
//         game_state.bullets[i].speed * game_state.bullets[i].direction * dt;
//
//     if (game_state.bullets[i].base.y > 1.0f ||
//         game_state.bullets[i].base.y < -1.0f) {
//       game_state.bullets[i].base.active = false;
//     }
//   }
// }
//
// void spawn_bullet(void) {
//   for (int i = 0; i < MAX_BULLETS; i++) {
//     if (!game_state.bullets[i].base.active) {
//       game_state.bullets[i].base.active = true;
//       game_state.bullets[i].base.x = game_state.player.base.x;
//       game_state.bullets[i].base.y = game_state.player.base.y + 0.1f;
//       game_state.bullets[i].base.width = 0.02f;
//       game_state.bullets[i].base.height = 0.06f;
//       game_state.bullets[i].speed = 2.0f;
//       game_state.bullets[i].direction = 1.0f;
//       break;
//     }
//   }
// }
//
// void check_collisions(void) {
//   for (int i = 0; i < MAX_BULLETS; i++) {
//     if (!game_state.bullets[i].base.active)
//       continue;
//
//     for (int j = 0; j < MAX_ENEMIES; j++) {
//       if (!game_state.enemies[j].base.active)
//         continue;
//
//       if (check_collision(game_state.bullets[i].base,
//                           game_state.enemies[j].base)) {
//         game_state.bullets[i].base.active = false;
//         game_state.enemies[j].base.active = false;
//         break;
//       }
//     }
//   }
// }
//
// _Bool check_collision(Entity a, Entity b) {
//   return (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height
//   &&
//           a.y + a.height > b.y);
// }

u32 background_starfield_seed = 0;

void background_render(void) {
  BackgroundRenderer *renderer = &game_state.renderer.background;
  glUseProgram(renderer->program);
  glBindVertexArray(renderer->v.vao);
  glUniform1f(renderer->time_uniform, game_state.game_time);
  if (background_starfield_seed == 0) {
    background_starfield_seed = rand();
  }
  glUniform1ui(renderer->seed_uniform, background_starfield_seed);

  glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
}

#define LOADING_BAR_BORDER 10.0f
#define LOADING_BAR_RADIUS 9999.9f
#define LOADING_BAR_HEIGHT 40.0f
#define LOADING_BAR_WIDTH 800.0f
#define LOADING_BAR_QUALITY 44
VAO loading_bar_outline = {0};
VAO loading_bar = {0};
Vec2 loading_bar_position = {0};
Vec2 loading_bar_minmax = {0};

const Vec2 loading_bar_size = {LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT};

void loading_bar_render(f32 percent) {
  ShapeRenderer *shapes = &game_state.renderer.shapes;
  LoadingBarRenderer *loader = &game_state.renderer.loader;

  glUseProgram(shapes->program);
  if (loading_bar_outline.vao == 0) {
    vao_setup(&loading_bar_outline);
  }

  if (window_changed_this_frame) {
    Vec2 *positions = malloc(sizeof(Vec2) * LOADING_BAR_QUALITY);
    ShapeRendererData *vertex_data =
        malloc(sizeof(ShapeRendererData) * LOADING_BAR_QUALITY);

    loading_bar_position.x =
        (window_size.x / 2.0f) - (loading_bar_size.x / 2.0f);
    loading_bar_position.y = window_size.y * 0.4f;

    rounded_rect_generate(positions, LOADING_BAR_QUALITY, loading_bar_position,
                          loading_bar_size, LOADING_BAR_RADIUS);

    loading_bar_minmax.x = positions[0].x;
    loading_bar_minmax.y = positions[0].x;
    for (size_t i = 0; i < LOADING_BAR_QUALITY; i++) {
      loading_bar_minmax.x = fminf(loading_bar_minmax.x, positions[i].x);
      loading_bar_minmax.y = fmaxf(loading_bar_minmax.y, positions[i].y);

      vertex_data[i].aPos = positions[i];
      f32 color = 200.0 / 255.0;
      vertex_data[i].aColor = (Vec4){{{color, color, color, 0.8}}};
    }

    shape_renderer_setup_vao(shapes, &loading_bar_outline, vertex_data,
                             LOADING_BAR_QUALITY);
    free(positions);
    free(vertex_data);
  } else {
    glBindVertexArray(loading_bar_outline.vao);
  }

  glUniform2f(shapes->resolution_uniform, window_size.x, window_size.y);
  glDrawElements(GL_TRIANGLE_FAN, LOADING_BAR_QUALITY, GL_UNSIGNED_SHORT, NULL);

  glUseProgram(loader->program);
  if (loading_bar.vao == 0) {
    vao_setup(&loading_bar);
  }

  if (window_changed_this_frame) {
    Vec2 *positions = malloc(sizeof(Vec2) * LOADING_BAR_QUALITY);

    Vec2 position_without_border =
        vec2_add(loading_bar_position,
                 vec2(LOADING_BAR_BORDER / 2.0f, -LOADING_BAR_BORDER / 2.0f));
    Vec2 size_without_border =
        vec2_sub(loading_bar_size, vec2f(LOADING_BAR_BORDER));

    rounded_rect_generate(positions, LOADING_BAR_QUALITY,
                          position_without_border, size_without_border,
                          LOADING_BAR_RADIUS);

    loader_renderer_setup(loader, &loading_bar, positions, LOADING_BAR_QUALITY);
    free(positions);
  } else {
    glBindVertexArray(loading_bar.vao);
  }

  glUniform1f(loader->percent_uniform, percent);
  glUniform2f(loader->minmax_coord_uniform, loading_bar_minmax.x,
              loading_bar_minmax.y);
  glUniform2f(loader->resolution_uniform, window_size.x, window_size.y);
  glUniform4f(loader->color_uniform, 1.0, 0.0, 0.0, 1.0);
  glDrawElements(GL_TRIANGLE_FAN, LOADING_BAR_QUALITY, GL_UNSIGNED_SHORT, NULL);
}

// void render_game(void) {
//   glClear(GL_COLOR_BUFFER_BIT);
//   glUseProgram(game_state.shader_program);
//
//   GLint pos_location =
//       glGetUniformLocation(game_state.shader_program, "uPosition");
//
//   if (game_state.player.base.active) {
//     glUniform2f(pos_location, game_state.player.base.x,
//                 game_state.player.base.y);
//     glBindVertexArray(game_state.vao);
//     glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
//   }
//
//   for (int i = 0; i < MAX_ENEMIES; i++) {
//     if (!game_state.enemies[i].base.active)
//       continue;
//
//     glUniform2f(pos_location, game_state.enemies[i].base.x,
//                 game_state.enemies[i].base.y);
//     glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
//   }
//
//   for (int i = 0; i < MAX_BULLETS; i++) {
//     if (!game_state.bullets[i].base.active)
//       continue;
//
//     glUniform2f(pos_location, game_state.bullets[i].base.x,
//                 game_state.bullets[i].base.y);
//     glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
//   }
// }
//
void handle_keydown(void) {
  if (strcmp("ArrowLeft", keyhandler_buffer) == 0) {
    game_state.actions.move_left = true;
  } else if (strcmp("ArrowRight", keyhandler_buffer) == 0) {
    game_state.actions.move_right = true;
  } else if (strcmp("Space", keyhandler_buffer) == 0) {
    game_state.actions.shoot = true;
  }
}

void handle_keyup(void) {
  if (strcmp("ArrowLeft", keyhandler_buffer) == 0) {
    game_state.actions.move_left = false;
  } else if (strcmp("ArrowRight", keyhandler_buffer) == 0) {
    game_state.actions.move_right = false;
  } else if (strcmp("Space", keyhandler_buffer) == 0) {
    game_state.actions.shoot = false;
  }
}

void *ptr = NULL;
size_t len = 1 << 16;

void *frame(f32 dt) {
  game_state.delta_time = dt;
  game_state.game_time += dt;

  background_render();
  //   update_player(dt);
  //   update_enemies(dt);
  //   update_bullets(dt);
  //   check_collisions();
  //   render_game();

  window_changed_this_frame = false;

  return (void *)frame;
}

void window_resize_handler(f32 width, f32 height) {
  window_size.x = width;
  window_size.y = height;
  window_changed_this_frame = true;
  glViewport(0, 0, width, height);
}

typedef struct {
  const char *asset;
  s32 request_id;
  Texture *out;
} LoadingAsset;

s32 all_assets = 0;
s32 finished_assets = 0;
LoadingAsset assets_loading[32] = {0};

void *loading_screen_loop(f32 diff) {
  game_state.delta_time = diff;
  game_state.game_time += diff;

  background_render();
  loading_bar_render((float)finished_assets / (float)all_assets);

  window_changed_this_frame = false;

  if (all_assets > finished_assets) {
    return (void *)loading_screen_loop;
  } else {
    return (void *)frame;
  }
}

void on_loading_progress(s32 key) {
  finished_assets += 1;

  for (s32 index = 0; index < ARRAY_LEN(assets_loading); index++) {
    if (assets_loading[index].request_id == key) {
      f32 width = 0;
      f32 height = 0;
      u8 *bytes = 0;
      check_img_response(key, &width, &height, &bytes);
      if (width == 0 || height == 0 || bytes == NULL) {
        printf("You said you were ready");
        exit(1);
      }
      Texture *out = assets_loading[index].out;
      out->size = (Vec2){width, height};

      glGenTextures(1, &out->id);
      glBindTexture(GL_TEXTURE_2D, out->id);

      glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
      glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
      glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
      glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

      glTexImage2D(GL_TEXTURE_2D, 0, GL_SRGB8, width, height, 0, GL_RGB,
                   GL_UNSIGNED_BYTE, bytes);

      assets_loading[index] = (LoadingAsset){0};
      wfree(bytes);
    }
  }
}

void load_img(const char *path, Texture *out) {
  s32 index = 0;
  while (assets_loading[index].asset != NULL) {
    index += 1;
    if (index >= ARRAY_LEN(assets_loading)) {
      exit(1);
    }
  }
  assets_loading[index].asset = path;
  assets_loading[index].request_id =
      send_img_request(path, on_loading_progress);
  assets_loading[index].out = out;

  all_assets += 1;
}

EXPORT("_start")
int _start() {
  srand(time_ms(NULL));
  setCurrentWebgl2Canvas("game");
  onWindowResize(window_resize_handler);

  onKeyDown(keyhandler_buffer, handle_keydown);
  onKeyUp(keyhandler_buffer, handle_keyup);

  init_graphics();
  // init_player();
  // init_enemies();

  load_img("bullet.png", &game_state.player.bullet.texture);
  load_img("enemybullet.png", &game_state.bullet_types[0].texture);

  requestAnimationFrameLoop(loading_screen_loop);

  return sizeof(size_t);
}

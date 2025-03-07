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

f32  scaling     = 0.0f;
Vec2 game_size   = {400.0f, 500.0f};
Vec2 window_size = {0};

typedef struct
{
    GLuint program;
    VAO    v;
    GLint  resolution_uniform;
    GLint  scaling_uniform;
    GLint  time_uniform;
    GLint  seed_uniform;
} BackgroundRenderer;

typedef struct
{
    GLuint program;
    GLint  texture_uniform;
    GLint  resolution_uniform;
    GLint  position_uniform;
    GLint  size_uniform;
} SpriteRenderer;

typedef struct
{
    GLuint program;
} UIRenderer;

typedef struct
{
    GLuint program;
    GLint  resolution_uniform;
    GLint  color_uniform;
    GLint  percent_uniform;
    GLint  minmax_coord_uniform;
} LoadingBarRenderer;

typedef struct
{
    GLuint program;
    GLint  resolution_uniform;
} ShapeRenderer;

typedef struct
{
    GLuint id;
    // Vec2   size;
} Texture;

typedef struct
{
    BackgroundRenderer background;
    SpriteRenderer     sprite;
    UIRenderer         ui;
    LoadingBarRenderer loader;
    ShapeRenderer      shapes;
} RenderSystem;

typedef struct
{
    Texture texture;
    Vec2    position;
    Vec2    size;
} Sprite;

typedef struct
{
    _Bool active;
} Entity;

typedef struct
{
    Entity  base;
    Sprite  sprite;
    Texture bullet;
    f32     last_fire;
    f32     speed;
} Player;

typedef struct
{
    Texture texture;
    Vec2    size;
    f32     speed;
} EnemyType;

typedef struct
{
    Entity base;
    Sprite sprite;
    s16    enemy_type;
} Enemy;

typedef struct
{
    Texture texture;
    Vec2    size;
} BulletType;

typedef struct
{
    Entity base;
    Sprite sprite;
    f32    speed;
    f32    direction;
} Bullet;

enum MovementKey
{
    MOVEMENT_NONE,
    MOVEMENT_LEFT,
    MOVEMENT_RIGHT,
};

typedef struct
{
    enum MovementKey last_movement_key;
    _Bool            move_left;
    _Bool            move_right;
    _Bool            shoot;
    f32              movement_analog;
} Actions;

typedef struct
{
    RenderSystem renderer;
    Actions      actions;
    Player       player;
    Enemy        enemies[MAX_ENEMIES];
    Bullet       bullets[MAX_BULLETS];
    BulletType   bullet_types[10];
    EnemyType    enemy_types[10];
    f32          delta_time;
    f32          game_time;
} GameState;

GameState game_state = {0};

void background_renderer_init(BackgroundRenderer *renderer)
{
    vao_setup(&renderer->v);

    f32 verticies[] = {
        -1.0f, 1.0f, 1.0f, 1.0f, 1.0f, -1.0f, -1.0f, -1.0f,
    };
    u16 indicies[] = {0, 1, 2, 0, 2, 3};
    glBindBuffer(GL_ARRAY_BUFFER, renderer->v.vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(verticies), &verticies, GL_STATIC_DRAW);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, renderer->v.ibo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indicies), indicies, GL_STATIC_DRAW);

    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, false, 0, 0);

    renderer->resolution_uniform = glGetUniformLocation(renderer->program, "u_resolution");
    renderer->scaling_uniform    = glGetUniformLocation(renderer->program, "u_scaling");
    renderer->time_uniform       = glGetUniformLocation(renderer->program, "u_time");
    renderer->seed_uniform       = glGetUniformLocation(renderer->program, "u_seed");
}

void shape_renderer_init(ShapeRenderer *renderer)
{
    renderer->resolution_uniform = glGetUniformLocation(renderer->program, "u_resolution");
}

typedef struct
{
    Vec2 aPos;
    Vec4 aColor;
} ShapeRendererData;

void shape_renderer_setup_vao(ShapeRenderer *renderer, VAO *v, ShapeRendererData *data, int n)
{
    if (v->vao == 0)
    {
        vao_setup(v);
    }
    glBindVertexArray(v->vao);

    glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(ShapeRendererData) * n, data, GL_STATIC_DRAW);

    size_t indicies_bytes = sizeof(u16) * n;
    u16   *indicies       = malloc(indicies_bytes);
    iota(indicies, n);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, indicies_bytes, indicies, GL_STATIC_DRAW);
    free(indicies);

    glEnableVertexAttribArray(0);
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(0, 2, GL_FLOAT, false, sizeof(ShapeRendererData), 0);
    glVertexAttribPointer(1, 4, GL_FLOAT, false, sizeof(ShapeRendererData), (void *)8);
}

void loader_renderer_init(LoadingBarRenderer *renderer)
{
    renderer->resolution_uniform   = glGetUniformLocation(renderer->program, "u_resolution");
    renderer->color_uniform        = glGetUniformLocation(renderer->program, "u_color");
    renderer->minmax_coord_uniform = glGetUniformLocation(renderer->program, "u_minmax_coord");
    renderer->percent_uniform      = glGetUniformLocation(renderer->program, "u_percent");
}

void loader_renderer_setup(LoadingBarRenderer *renderer, VAO *v, Vec2 *data, int n)
{
    if (v->vao == 0)
    {
        vao_setup(v);
    }
    glBindVertexArray(v->vao);
    glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(Vec2) * n, data, GL_STATIC_DRAW);

    size_t indicies_bytes = sizeof(u16) * n;
    u16   *indicies       = malloc(indicies_bytes);
    iota(indicies, n);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, indicies_bytes, indicies, GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, false, sizeof(Vec2), 0);

    free(indicies);
}

void sprite_renderer_init(SpriteRenderer *sprite)
{
    sprite->resolution_uniform = glGetUniformLocation(sprite->program, "u_resolution");
    sprite->texture_uniform    = glGetUniformLocation(sprite->program, "u_texture");
    sprite->position_uniform   = glGetUniformLocation(sprite->program, "u_position");
    sprite->size_uniform       = glGetUniformLocation(sprite->program, "u_size");
}

void sprite_renderer_setup(SpriteRenderer *renderer, VAO *v)
{
    if (v->vao == 0)
    {
        vao_setup(v);
    }
    glUseProgram(renderer->program);
    glBindVertexArray(v->vao);

    float    vertices[] = {0.0f, 1.0f, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f,
                           1.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
    GLushort indices[]  = {0, 1, 2, 2, 3, 0};

    glBindBuffer(GL_ARRAY_BUFFER, v->vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_DYNAMIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, v->ibo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_DYNAMIC_DRAW);

    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void *)0);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void *)(2 * sizeof(float)));
    glEnableVertexAttribArray(1);
}

GLuint shader_compile(const char *vs, const char *fs)
{
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
    if (link_status != GL_TRUE)
    {
        GLchar  log[1024];
        GLsizei log_length;

        glGetShaderInfoLog(vs_shader, sizeof(log), &log_length, log);
        if (log_length > 0)
        {
            printf("Vertex shader log:\n%s\n\nVertex shader source:\n%s", log, vs);
        }

        glGetShaderInfoLog(fs_shader, sizeof(log), &log_length, log);
        if (log_length > 0)
        {
            printf("Frag shader log:\n%s\n\nFrag shader source:\n%s", log, fs);
        }

        glGetProgramInfoLog(program, sizeof(log), &log_length, log);
        if (log_length > 0)
        {
            printf("Program log:\n%s", log);
        }

        glDeleteProgram(program);
        program = 0;
    }

    glDeleteShader(vs_shader);
    glDeleteShader(fs_shader);

    return program;
}

void graphics_init(void)
{
    static const char sprites_vs_src[] = {
#embed "shaders/sprites.vert"
        , 0};
    static const char sprites_fs_src[] = {
#embed "shaders/sprites.frag"
        , 0};
    static const char background_vs_src[] = {
#embed "shaders/background.vert"
        , 0};
    static const char background_fs_src[] = {
#embed "shaders/background.frag"
        , 0};
    static const char ui_vs_src[] = {
#embed "shaders/ui.vert"
        , 0};
    static const char ui_fs_src[] = {
#embed "shaders/ui.frag"
        , 0};
    static const char loader_vs_src[] = {
#embed "shaders/loader.vert"
        , 0};
    static const char loader_fs_src[] = {
#embed "shaders/loader.frag"
        , 0};
    static const char shape_vs_src[] = {
#embed "shaders/shape.vert"
        , 0};
    static const char shape_fs_src[] = {
#embed "shaders/shape.frag"
        , 0};

    game_state.renderer.sprite.program = shader_compile(sprites_vs_src, sprites_fs_src);
    game_state.renderer.ui.program     = shader_compile(ui_vs_src, ui_fs_src);
    game_state.renderer.loader.program = shader_compile(loader_vs_src, loader_fs_src);

    game_state.renderer.background.program = shader_compile(background_vs_src, background_fs_src);
    game_state.renderer.shapes.program     = shader_compile(shape_vs_src, shape_fs_src);

    background_renderer_init(&game_state.renderer.background);
    shape_renderer_init(&game_state.renderer.shapes);
    loader_renderer_init(&game_state.renderer.loader);
    sprite_renderer_init(&game_state.renderer.sprite);

    {
        glEnable(GL_BLEND);
        glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
    }

    glPixelStorei(GL_UNPACK_FLIP_Y_WEBGL, true);
}

#define BULLET_WIDTH 8
#define BULLET_HEIGHT 8

void bullets_init(void)
{
    game_state.bullet_types[0].size = vec2(BULLET_WIDTH, BULLET_HEIGHT);
    game_state.bullet_types[1].size = vec2(BULLET_WIDTH, BULLET_HEIGHT);
}

#define PLAYER_WIDTH 50
#define PLAYER_HEIGHT 50

void player_init(void)
{
    game_state.player.base.active     = true;
    game_state.player.sprite.size     = vec2(PLAYER_WIDTH, PLAYER_HEIGHT);
    game_state.player.sprite.position = rect_center_child(game_size, game_state.player.sprite.size);
    game_state.player.sprite.position.y = 10.0f;
    game_state.player.speed             = 1.0f;
}

// void enemies_init(void)
// {
//     f32 x_start   = -0.8f;
//     f32 y_start   = 0.8f;
//     f32 x_spacing = 0.2f;
//     f32 y_spacing = 0.15f;
//
//     for (int i = 0; i < MAX_ENEMIES; i++)
//     {
//         int row = i / 10;
//         int col = i % 10;
//
//         game_state.enemies[i].base.x      = x_start + (col * x_spacing);
//         game_state.enemies[i].base.y      = y_start - (row * y_spacing);
//         game_state.enemies[i].base.width  = 0.08f;
//         game_state.enemies[i].base.height = 0.08f;
//         game_state.enemies[i].base.active = true;
//         game_state.enemies[i].speed       = 0.5f;
//     }
// }

void bullet_spawn(s32 bullet_type_key, f32 direction);
void player_update(f32 dt)
{
    Player *player         = &game_state.player;
    f32     movement_speed = game_size.x * 0.75;
    f32     min_left       = 10.0f;
    f32     max_right      = game_size.x - 10.0f - player->sprite.size.x;

    player->sprite.position.x = clampf(player->sprite.position.x, min_left, max_right);

    if (game_state.actions.last_movement_key == MOVEMENT_LEFT)
    {
        if (player->sprite.position.x > min_left)
        {
            player->sprite.position.x -= player->speed * dt * movement_speed;
        }
    }
    else if (game_state.actions.last_movement_key == MOVEMENT_RIGHT)
    {
        if (player->sprite.position.x < max_right)
        {
            player->sprite.position.x += player->speed * dt * movement_speed;
        }
    }
    f32 current_time = monotonic_time();
    f32 last_fire    = player->last_fire;
    f32 fire_rate    = 0.25;
    if (game_state.actions.shoot && current_time > last_fire + fire_rate)
    {
        player->last_fire = current_time;
        bullet_spawn(0, 1.0f);
    }
}
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
void bullets_update(f32 dt)
{
    for (int i = 0; i < MAX_BULLETS; i++)
    {
        if (!game_state.bullets[i].base.active)
            continue;
        game_state.bullets[i].sprite.position.y +=
            game_state.bullets[i].speed * game_state.bullets[i].direction * dt;

        if (game_state.bullets[i].sprite.position.y > game_size.y ||
            game_state.bullets[i].sprite.position.y < 0)
        {
            game_state.bullets[i] = (Bullet){0};
        }
    }
}

void bullet_spawn(s32 bullet_type_key, f32 direction)
{
    BulletType bullet_type = game_state.bullet_types[bullet_type_key];

    for (int i = 0; i < MAX_BULLETS; i++)
    {
        if (!game_state.bullets[i].base.active)
        {
            Vec2 center   = rect_calculate_center(game_state.player.sprite.position,
                                                  game_state.player.sprite.size);
            Vec2 position = rect_calculate_position_from_center(center, bullet_type.size);
            position.y =
                game_state.player.sprite.position.y + game_state.player.sprite.size.y + 2.5f;
            game_state.bullets[i].base.active     = true;
            game_state.bullets[i].sprite.position = position;
            game_state.bullets[i].sprite.texture  = bullet_type.texture;
            game_state.bullets[i].sprite.size     = bullet_type.size;
            game_state.bullets[i].speed           = 1000.0f;
            game_state.bullets[i].direction       = direction;
            break;
        }
    }
}

u32 background_starfield_seed = 0;

void background_render(void)
{
    BackgroundRenderer *renderer = &game_state.renderer.background;
    glUseProgram(renderer->program);
    glBindVertexArray(renderer->v.vao);
    glUniform2f(renderer->resolution_uniform, window_size.x, window_size.y);
    glUniform1f(renderer->scaling_uniform, scaling);
    glUniform1f(renderer->time_uniform, game_state.game_time);
    if (background_starfield_seed == 0)
    {
        background_starfield_seed = rand();
    }
    glUniform1ui(renderer->seed_uniform, background_starfield_seed);

    glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, NULL);
}

#define LOADING_BAR_BORDER 2.0f
#define LOADING_BAR_RADIUS 9999.9f
#define LOADING_BAR_HEIGHT 15.0f
#define LOADING_BAR_WIDTH 300.0f
#define LOADING_BAR_QUALITY 44
VAO  loading_bar_outline  = {0};
VAO  loading_bar          = {0};
Vec2 loading_bar_position = {0};
Vec2 loading_bar_minmax   = {0};

const Vec2 loading_bar_size = {LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT};

void loading_bar_render(f32 percent)
{
    // printf("%f", percent);
    ShapeRenderer      *shapes = &game_state.renderer.shapes;
    LoadingBarRenderer *loader = &game_state.renderer.loader;

    glUseProgram(shapes->program);

    if (loading_bar_outline.vao == 0)
    {
        Vec2              *positions   = malloc(sizeof(Vec2) * LOADING_BAR_QUALITY);
        ShapeRendererData *vertex_data = malloc(sizeof(ShapeRendererData) * LOADING_BAR_QUALITY);

        loading_bar_position.x = (game_size.x / 2.0f) - (loading_bar_size.x / 2.0f);
        loading_bar_position.y = game_size.y * 0.4f;

        rounded_rect_generate(positions, LOADING_BAR_QUALITY, loading_bar_position,
                              loading_bar_size, LOADING_BAR_RADIUS);

        loading_bar_minmax.x = positions[0].x;
        loading_bar_minmax.y = positions[0].x;
        for (size_t i = 0; i < LOADING_BAR_QUALITY; i++)
        {
            loading_bar_minmax.x = fminf(loading_bar_minmax.x, positions[i].x);
            loading_bar_minmax.y = fmaxf(loading_bar_minmax.y, positions[i].y);

            vertex_data[i].aPos   = positions[i];
            f32 color             = 200.0 / 255.0;
            vertex_data[i].aColor = (Vec4){{{color, color, color, 0.8}}};
        }

        shape_renderer_setup_vao(shapes, &loading_bar_outline, vertex_data, LOADING_BAR_QUALITY);
        free(positions);
        free(vertex_data);
    }
    else
    {
        glBindVertexArray(loading_bar_outline.vao);
    }

    glUniform2f(shapes->resolution_uniform, window_size.x, window_size.y);
    glDrawElements(GL_TRIANGLE_FAN, LOADING_BAR_QUALITY, GL_UNSIGNED_SHORT, NULL);

    glUseProgram(loader->program);

    if (loading_bar.vao == 0)
    {
        Vec2 *positions = malloc(sizeof(Vec2) * LOADING_BAR_QUALITY);

        Vec2 position_without_border = vec2_add(
            loading_bar_position, vec2(LOADING_BAR_BORDER / 2.0f, -LOADING_BAR_BORDER / 2.0f));
        Vec2 size_without_border = vec2_sub(loading_bar_size, vec2f(LOADING_BAR_BORDER));

        rounded_rect_generate(positions, LOADING_BAR_QUALITY, position_without_border,
                              size_without_border, LOADING_BAR_RADIUS);

        loader_renderer_setup(loader, &loading_bar, positions, LOADING_BAR_QUALITY);
        free(positions);
    }
    else
    {
        glBindVertexArray(loading_bar.vao);
    }

    glUniform1f(loader->percent_uniform, percent);
    glUniform2f(loader->minmax_coord_uniform, loading_bar_minmax.x, loading_bar_minmax.y);
    glUniform2f(loader->resolution_uniform, window_size.x, window_size.y);
    glUniform4f(loader->color_uniform, 1.0, 0.0, 0.0, 1.0);
    glDrawElements(GL_TRIANGLE_FAN, LOADING_BAR_QUALITY, GL_UNSIGNED_SHORT, NULL);
}

VAO sprite_vao = {0};

void sprite_render(Sprite *sprite)
{
    SpriteRenderer *renderer = &game_state.renderer.sprite;
    if (sprite_vao.vao == 0)
    {
        sprite_renderer_setup(renderer, &sprite_vao);
    }
    glUseProgram(renderer->program);

    glBindVertexArray(sprite_vao.vao);

    assert(renderer->resolution_uniform);
    assert(renderer->position_uniform);
    assert(renderer->size_uniform);
    glUniform2f(renderer->resolution_uniform, window_size.x, window_size.y);
    glUniform2f(renderer->position_uniform, sprite->position.x, sprite->position.y);
    glUniform2f(renderer->size_uniform, sprite->size.x, sprite->size.y);

    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, sprite->texture.id);
    glUniform1i(renderer->texture_uniform, 0);

    glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, 0);
}

void handle_keydown(void)
{
    if (strcmp("ArrowLeft", keyhandler_buffer) == 0)
    {
        game_state.actions.last_movement_key = MOVEMENT_LEFT;
        game_state.actions.move_left         = true;
    }
    else if (strcmp("ArrowRight", keyhandler_buffer) == 0)
    {
        game_state.actions.last_movement_key = MOVEMENT_RIGHT;
        game_state.actions.move_right        = true;
    }
    else if (strcmp("Space", keyhandler_buffer) == 0)
    {
        game_state.actions.shoot = true;
    }
}

void handle_keyup(void)
{
    if (strcmp("ArrowLeft", keyhandler_buffer) == 0)
    {
        game_state.actions.move_left = false;
        if (game_state.actions.move_right)
        {
            game_state.actions.last_movement_key = MOVEMENT_RIGHT;
        }
        else
        {
            game_state.actions.last_movement_key = MOVEMENT_NONE;
        }
    }
    else if (strcmp("ArrowRight", keyhandler_buffer) == 0)
    {
        game_state.actions.move_right = false;
        if (game_state.actions.move_left)
        {
            game_state.actions.last_movement_key = MOVEMENT_LEFT;
        }
        else
        {
            game_state.actions.last_movement_key = MOVEMENT_NONE;
        }
    }
    else if (strcmp("Space", keyhandler_buffer) == 0)
    {
        game_state.actions.shoot = false;
    }
}

void  *ptr = NULL;
size_t len = 1 << 16;

void *game_loop(f32 dt)
{
    game_state.delta_time = dt;
    game_state.game_time += dt;

    glClear(GL_COLOR_BUFFER_BIT);

    player_update(dt);
    bullets_update(dt);
    background_render();
    sprite_render(&game_state.player.sprite);
    for (int i = 0; i < MAX_BULLETS; i++)
    {
        if (game_state.bullets[i].base.active)
        {
            sprite_render(&game_state.bullets[i].sprite);
        }
    }

    return (void *)game_loop;
}

void window_resize_handler(f32 width, f32 height)
{
#if 0
    f32 game_ratio   = game_size.x / game_size.y;
    f32 screen_ratio = width / height;

    if (game_ratio <= screen_ratio)
    {
        scaling = height / game_size.y;

        f32 adjusted_screen_width = width / scaling;
        game_position.x           = (adjusted_screen_width - game_size.x) / 2.0f;
        game_position.y           = 0;
    }
    else
    {
        scaling = width / game_size.x;

        f32 adjusted_screen_height = height / scaling;
        game_position.x            = 0;
        game_position.y            = (adjusted_screen_height - game_size.y) / 2.0f;
    }
    // printf("game_position: %f, %f\n", game_position.x, game_position.y);
#endif
#if 1
    f32 game_ratio   = game_size.x / game_size.y;
    f32 screen_ratio = width / height;

    if (game_ratio <= screen_ratio)
    {
        scaling = height / game_size.y;

        window_size.x = width / scaling;
        window_size.y = game_size.y;
    }
    else
    {
        scaling = width / game_size.x;

        window_size.y = height / scaling;
        window_size.x = game_size.x;
    }
#endif
#if 0
    printf("%f <= %f, scaling %f", game_ratio, screen_ratio, scaling);
    printf("width: %f, height: %f", width, height);
    printf("game_size.x: %f, game_size.y: %f", game_size.x, game_size.y);
    printf("scaling %f", scaling);
    printf("game_position.x: %f, game_position.y: %f", game_position.x, game_position.y);
#endif

    glViewport(0, 0, width, height);
}

typedef struct
{
    const char *asset;
    s32         request_id;
    Texture    *out;
} LoadingAsset;

s32          all_assets         = 0;
s32          finished_assets    = 0;
LoadingAsset assets_loading[32] = {0};

f32 loading = 0.0;

void *loading_screen_loop(f32 diff)
{
    game_state.delta_time = diff;
    game_state.game_time += diff;

    background_render();
#if 1
    loading_bar_render((float)finished_assets / (float)all_assets);

    if (finished_assets >= all_assets)
    {
        return (void *)game_loop;
    }
#else
    loading_bar_render(loading / 100.0f);
    loading += 0.1f;
    if (loading > 101.0f)
    {
        loading -= 100.0f;
    }
#endif

    return (void *)loading_screen_loop;
}

void on_loading_progress(s32 key)
{
    finished_assets += 1;

    for (s32 index = 0; index < ARRAY_LEN(assets_loading); index++)
    {
        if (assets_loading[index].request_id == key)
        {
            f32 width  = 0;
            f32 height = 0;
            u8 *bytes  = 0;
            check_img_response(key, &width, &height, &bytes);
            if (width == 0 || height == 0 || bytes == NULL)
            {
                printf("You said you were ready");
                exit(1);
            }
            Texture *out = assets_loading[index].out;

            glGenTextures(1, &out->id);
            glBindTexture(GL_TEXTURE_2D, out->id);

            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

            glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE,
                         bytes);
            glGenerateMipmap(GL_TEXTURE_2D);

            assets_loading[index] = (LoadingAsset){0};
            wfree(bytes);
        }
    }
}

void load_img(const char *path, Texture *out)
{
    s32 index = 0;
    while (assets_loading[index].asset != NULL)
    {
        index += 1;
        if (index >= ARRAY_LEN(assets_loading))
        {
            exit(1);
        }
    }
    assets_loading[index].asset      = path;
    assets_loading[index].request_id = send_img_request(path, on_loading_progress);
    assets_loading[index].out        = out;

    all_assets += 1;
}

EXPORT("_start")
int _start()
{
    srand(time_ms(NULL));
    setCurrentWebgl2Canvas("game");
    onWindowResize(window_resize_handler);

    onKeyDown(keyhandler_buffer, handle_keydown);
    onKeyUp(keyhandler_buffer, handle_keyup);

    graphics_init();
    bullets_init();
    player_init();

    load_img("enemybullet.png", &game_state.bullet_types[1].texture);
    load_img("bullet.png", &game_state.bullet_types[0].texture);
    load_img("ship.png", &game_state.player.sprite.texture);

    requestAnimationFrameLoop(loading_screen_loop);

    return sizeof(size_t);
}

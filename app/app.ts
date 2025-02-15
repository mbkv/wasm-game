import "normalize.css";
import "./app.css";
import { mapUpsert } from "./utils";

const isDev = false;

interface WasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  __indirect_function_table: WebAssembly.Table;
  _start: () => void;
  walloc(size: number): number;
  wfree(size: number): number;
}

interface WasmInstance {
  env: Record<string, Function>;
  webgl: Record<string, Function>;
}

function assert(condition: any, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

function unimplemented(name: string): never {
  throw new Error(`Unimplemented: ${name}`);
}

const strlen = (ptr: number) => {
  const view = new Uint8Array(wasmExports.memory.buffer, ptr);
  let len = 0;

  // surprisingly this actually works with utf8 strings because utf-8 strings
  // always have a 11 or 10 prefix for multibyte. ie
  // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
  while (view[len] !== 0) {
    len += 1;
  }
  return len + 1;
};

function parseCString(ptr: number, length?: number): string {
  length = length ?? strlen(ptr) - 1;
  const textDecoder = new TextDecoder();
  const view = new Uint8Array(wasmExports.memory.buffer, ptr, length);
  return textDecoder.decode(view);
}
function writeCString(output: Uint8Array, string: string) {
  const textEncoder = new TextEncoder();
  let encoded = textEncoder.encode(string);
  console.assert(
    encoded.byteLength <= output.byteLength,
    "could not fully write into output",
  );
  encoded = encoded.slice(0, output.byteLength - 1);
  output.set(encoded);
  output[encoded.byteLength] = 0;
  return encoded.byteLength + 1;
}

class FreeListArray<T> {
  array: (T | undefined)[] = [undefined];
  protected freelist: number[] = [];

  getWithoutAssert(idx: number) {
    const element = this.array[idx];
    console.assert(!!element, "Invalid element");
    return element;
  }

  get(idx: number) {
    const element = this.array[idx];
    assert(element, "Invalid element");
    return element;
  }

  push(value: T) {
    const idx = this.create();

    this.array[idx] = value;
    return idx;
  }

  create(): number {
    if (!isDev) {
      if (this.freelist.length) {
        return this.freelist.pop()!;
      }
    }
    return this.array.push(undefined) - 1;
  }
  delete(idx: number) {
    this.array[idx] = undefined;
    if (!isDev) {
      this.freelist.push(idx);
    }
  }
}

// I pinky promise not to use this before wasm is loaded
let wasmExports: WasmExports = undefined as any;

let ctx: WebGL2RenderingContext | undefined;

function assertCtx(ctx: WebGL2RenderingContext | undefined): asserts ctx {
  assert(ctx, "Ctx not initialized");
}

function checkGlErrors(gl: WebGL2RenderingContext, name: string) {
  let hasErrors: boolean = false;
  while (true) {
    const error = gl.getError();
    hasErrors = hasErrors && error === gl.NO_ERROR;
    switch (error) {
      case gl.NO_ERROR:
        return hasErrors;
      case 0:
        console.error("getError() returned an error");
        break;
      case gl.INVALID_ENUM:
        console.error(`${name}: INVALID_ENUM`);
        break;
      case gl.INVALID_VALUE:
        console.error(`${name}: INVALID_VALUE`);
        break;
      case gl.INVALID_OPERATION:
        console.error(`${name}: INVALID_OPERATION`);
        break;
      case gl.INVALID_FRAMEBUFFER_OPERATION:
        console.error(`${name}: INVALID_FRAMEBUFFER_OPERATION`);
        break;
      case gl.OUT_OF_MEMORY:
        console.error(`${name}: OUT_OF_MEMORY`);
        break;
      default:
        console.error(`${name}: Unknown error`, error);
    }
  }
}

const buffers = new FreeListArray<WebGLBuffer>();
const framebuffers = new FreeListArray<WebGLFramebuffer>();
const programs = new FreeListArray<WebGLProgram>();
const shaders = new FreeListArray<WebGLShader>();
const textures = new FreeListArray<WebGLTexture>();
const vaos = new FreeListArray<WebGLVertexArrayObject>();
const uniforms = new FreeListArray<WebGLUniformLocation | null>();
const uniformsByProgram = new Map<number, Map<string, number>>();

interface ImageRequest {
  promise: Promise<void>;
  status: "success" | "failure" | "pending";
  width?: number;
  height?: number;
  bytes?: Uint8ClampedArray;
}

const loadImageRequests = new FreeListArray<ImageRequest>();

function makeGlFunction<args extends any[], ret extends any>(
  name: string,
  fn?: (ctx: WebGL2RenderingContext, ...args: args) => ret,
) {
  function wrapper(this: (typeof wasmInstance)["webgl"], ...args: args) {
    assertCtx(ctx);
    if (fn == null) {
      unimplemented(name);
    }
    try {
      return fn.call(this, ctx, ...args);
    } finally {
      if (isDev) {
        checkGlErrors(ctx, name);
      }
    }
  }

  return wrapper;
}

class ExitError extends Error {
  constructor(public code: number) {
    super(`Program exited with code ${code}`);
  }
}

const wasmInstance = {
  env: {
    exit(int): never {
      throw new ExitError(int);
    },
    breakpoint: function (): void {
      debugger;
    },
    print: function (ptr: number): void {
      console.log(parseCString(ptr));
    },
    setCurrentWebgl2Canvas(ptr: number): void {
      const str = parseCString(ptr);
      const element = document.getElementById(str);
      if (element instanceof HTMLCanvasElement) {
        ctx = element.getContext("webgl2") ?? undefined;
        if (ctx == null) {
          alert("Could not get webgl2 ctx");
        }
      } else {
        alert(`Could not get canvas from ${str}`);
      }
    },
    requestAnimationFrameLoop(fnPtr: number) {
      let fn = wasmExports.__indirect_function_table.get(fnPtr);

      let prevTimestamp = performance.now();
      function main() {
        const timestamp = performance.now();
        const diff = Math.max(timestamp - prevTimestamp, 2 / 60);
        prevTimestamp = timestamp;

        try {
          const result = fn(diff / 1000);

          if (!result) {
            return;
          }

          if (typeof result === "number") {
            fn = wasmExports.__indirect_function_table.get(result);
          }
          requestAnimationFrame(main);
        } catch (e) {
          if (e instanceof ExitError) {
            console.info(e.message);
          } else {
            console.error(e);
          }
        }
      }
      requestAnimationFrame(main);
    },
    sinf(float: number) {
      return Math.sin(float);
    },
    cosf(float: number) {
      return Math.cos(float);
    },
    sqrtf(float: number) {
      return Math.sqrt(float);
    },
    onKeyDown(buffer: number, fnPtr: number) {
      const fn = wasmExports.__indirect_function_table.get(fnPtr);
      document.body.addEventListener("keydown", (e) => {
        const dataview = new Uint8Array(wasmExports.memory.buffer, buffer, 32);
        const code = e.code;
        writeCString(dataview, code);
        fn();
      });
    },
    onKeyUp(buffer: number, fnPtr: number) {
      const fn = wasmExports.__indirect_function_table.get(fnPtr);
      document.body.addEventListener("keyup", (e) => {
        const dataview = new Uint8Array(wasmExports.memory.buffer, buffer, 32);
        const code = e.code;
        writeCString(dataview, code);
        fn();
      });
    },
    onWindowResize(fnPtr: number) {
      const devicePixelRatio = window.devicePixelRatio;
      const fn = wasmExports.__indirect_function_table.get(fnPtr);
      if (ctx) {
        ctx.canvas.width = window.innerWidth * devicePixelRatio;
        ctx.canvas.height = window.innerHeight * devicePixelRatio;
        fn(ctx.canvas.width, ctx.canvas.height);
      }
      window.addEventListener("resize", () => {
        if (ctx) {
          ctx.canvas.width = window.innerWidth * devicePixelRatio;
          ctx.canvas.height = window.innerHeight * devicePixelRatio;
          fn(ctx.canvas.width, ctx.canvas.height);
        }
      });
    },
    time: (ptr: number) => {
      const seconds_since_epoch = BigInt(Date.now()) / 1000n;
      if (ptr) {
        const dataview = new DataView(wasmExports.memory.buffer, ptr, 8);
        dataview.setBigUint64(0, seconds_since_epoch, true);
      }
      return seconds_since_epoch;
    },
    time_ms: (ptr: number) => {
      const ms_since_epoch = BigInt(Date.now());
      if (ptr) {
        const dataview = new DataView(wasmExports.memory.buffer, ptr, 8);
        dataview.setBigUint64(0, ms_since_epoch, true);
      }
      return ms_since_epoch;
    },
    monotonic_time() {
      return performance.now();
    },
    send_img_request: (filePtr: number, callbackFn: number): number => {
      const file = parseCString(filePtr);
      const response: ImageRequest = {
        status: "pending",
        promise: new Promise<void>((resolve, reject) => {
          const img = document.createElement("img");
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          assert(ctx, "failed to create 2d canvas");
          img.addEventListener("load", async () => {
            try {
              if (img.naturalWidth === 0) {
                response.status = "failure";
                reject();
              } else {
                const bitmap = await createImageBitmap(img);
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
                const imageData = ctx.getImageData(
                  0,
                  0,
                  bitmap.width,
                  bitmap.height,
                  {
                    colorSpace: "srgb",
                  },
                );
                response.width = img.naturalWidth;
                response.height = img.naturalHeight;
                response.bytes = imageData.data;
                response.status = "success";
                resolve();
              }
            } catch {
              response.status = "failure";
              reject();
            }
          });
          img.src = file;
        }),
      };
      const idx = loadImageRequests.push(response);
      if (callbackFn) {
        response.promise.then(() => {
          const fn = wasmExports.__indirect_function_table.get(callbackFn);
          fn(idx);
        });
      }
      return idx;
    },
    check_img_response: (
      idx: number,
      widthPtr: number,
      heightPtr: number,
      dataPtr: number,
    ) => {
      const request = loadImageRequests.get(idx);
      switch (request.status) {
        case "pending":
          return 1;
        case "failure":
          return -1;
        case "success":
          assert(
            request.width,
            "Request was marked as successful but width is empty",
          );
          assert(
            request.height,
            "Request was marked as successful but height is empty",
          );
          assert(
            request.bytes,
            "Request was marked as successful but bytes is empty",
          );

          const wasmMemoryPtr = wasmExports.walloc(request.bytes.byteLength);
          const wasmMemory = new Uint8Array(
            wasmExports.memory.buffer,
            wasmMemoryPtr,
            request.bytes.byteLength,
          );
          wasmMemory.set(request.bytes);

          const dataview = new DataView(wasmExports.memory.buffer);
          dataview.setFloat32(widthPtr, request.width, true);
          dataview.setFloat32(heightPtr, request.height, true);
          dataview.setUint32(dataPtr, wasmMemoryPtr, true);
          return 0;
      }
    },
    read(fd: number, buf: number, count: number) {
      unimplemented("read");
    },
    write(fd: number, buf: number, count: number) {
      switch (fd) {
        case 0:
          unimplemented("Tried to write into stdin");
          break;
        case 1: {
          const str = parseCString(buf, count);
          console.log(str);
          return str.length + 1;
        }
        case 2: {
          const str = parseCString(buf, count);
          console.error(str);
          return str.length + 1;
        }
        default:
          unimplemented("Tried to write into a random file");
      }
    },
  },

  webgl: {
    glActiveTexture: makeGlFunction(
      "glActiveTexture",
      (gl, texture: GLenum): void => {
        gl.activeTexture(texture);
      },
    ),
    glAttachShader: makeGlFunction(
      "glAttachShader",
      (gl, programIndex: GLuint, shaderIndex: GLuint): void => {
        const program = programs.get(programIndex);
        const shader = shaders.get(shaderIndex);
        gl.attachShader(program, shader);
      },
    ),
    glBindBuffer: makeGlFunction(
      "glBindBuffer",
      (gl, target: GLenum, bufferIndex: GLuint): void => {
        const buffer = buffers.get(bufferIndex);
        gl.bindBuffer(target, buffer);
      },
    ),
    glBindFrameBuffer: makeGlFunction(
      "glBindFrameBuffer",
      (gl, target: GLenum, framebufferIndex: GLuint): void => {
        const framebuffer = framebuffers.get(framebufferIndex);
        gl.bindFramebuffer(target, framebuffer);
      },
    ),
    glBindTexture: makeGlFunction(
      "glBindTexture",
      (gl, target: GLenum, textureIndex: GLuint): void => {
        const texture = textures.get(textureIndex);
        gl.bindTexture(target, texture);
      },
    ),
    glBindVertexArray: makeGlFunction(
      "glBindVertexArray",
      (gl, arrayIndex: GLuint): void => {
        const vao = vaos.get(arrayIndex);
        gl.bindVertexArray(vao);
      },
    ),
    glBlendEquation: makeGlFunction(
      "glBlendEquation",
      (gl, mode: GLenum): void => {
        gl.blendEquation(mode);
      },
    ),
    glBlendFunc: makeGlFunction(
      "glBlendFunc",
      (gl, sfactor: GLenum, dfactor: GLenum): void => {
        gl.blendFunc(sfactor, dfactor);
      },
    ),
    glBufferData: makeGlFunction(
      "glBufferData",
      (
        gl,
        target: GLenum,
        size: GLsizeiptr,
        data: number,
        usage: GLenum,
      ): void => {
        const buffer = new Uint8Array(
          wasmExports.memory.buffer,
          data,
          Number(size),
        );
        gl.bufferData(target, buffer, usage);
      },
    ),
    glBufferSubData: makeGlFunction(
      "glBufferSubData",
      (
        gl,
        target: GLenum,
        offset: GLintptr,
        size: GLsizeiptr,
        data: number,
      ): void => {
        const buffer = new Uint8Array(
          wasmExports.memory.buffer,
          data,
          Number(size),
        );
        gl.bufferSubData(target, offset, buffer);
      },
    ),
    glClear: makeGlFunction("glClear", (gl, mask: GLbitfield): void => {
      gl.clear(mask);
    }),
    glClearColor: makeGlFunction(
      "glClearColor",
      (
        gl,
        red: GLfloat,
        green: GLfloat,
        blue: GLfloat,
        alpha: GLfloat,
      ): void => {
        gl.clearColor(red, green, blue, alpha);
      },
    ),
    glClearDepth: makeGlFunction("glClearDepth", (gl, depth: GLfloat): void => {
      gl.clearDepth(depth);
    }),
    glCompileShader: makeGlFunction(
      "glCompileShader",
      (gl, shaderIndex: GLuint): void => {
        const shader = shaders.get(shaderIndex);
        gl.compileShader(shader);
      },
    ),
    glCreateBuffer: makeGlFunction("glCreateBuffer", (gl): GLuint => {
      return buffers.push(gl.createBuffer());
    }),
    glCreateFrameBuffer: makeGlFunction("glCreateFrameBuffer", (gl): GLuint => {
      return framebuffers.push(gl.createFramebuffer());
    }),
    glCreateProgram: makeGlFunction("glCreateProgram", (gl): GLuint => {
      return programs.push(gl.createProgram());
    }),
    glCreateShader: makeGlFunction(
      "glCreateShader",
      (gl, type: GLenum): GLuint => {
        const shader = gl.createShader(type);
        if (shader) {
          return shaders.push(shader);
        }
        return 0;
      },
    ),
    glCreateTexture: makeGlFunction("glCreateTexture", (gl): GLuint => {
      return textures.push(gl.createTexture());
    }),
    glCreateVertexArray: makeGlFunction("glCreateVertexArray", (gl): GLuint => {
      return textures.push(gl.createVertexArray());
    }),
    glDeleteBuffer: makeGlFunction(
      "glDeleteBuffer",
      (gl, buffer: GLuint): void => {
        const actualBuffer = buffers.get(buffer);
        gl.deleteBuffer(actualBuffer);
        buffers.delete(buffer);
      },
    ),
    glDeleteBuffers: makeGlFunction(
      "glDeleteBuffers",
      (gl, n: number, bufferIndexes: number): void => {
        const dataview = new DataView(wasmExports.memory.buffer, bufferIndexes);
        for (let i = 0; i < n; i++) {
          const buffer = dataview.getUint32(i * 4);
          const actualBuffer = buffers.get(buffer);
          gl.deleteBuffer(actualBuffer);
          buffers.delete(buffer);
        }
      },
    ),
    glDeleteFrameBuffer: makeGlFunction(
      "glDeleteFrameBuffer",
      (gl, framebuffer: GLuint): void => {
        const actualFramebuffer = framebuffers.get(framebuffer);
        gl.deleteFramebuffer(actualFramebuffer);
        framebuffers.delete(framebuffer);
      },
    ),
    glDeleteProgram: makeGlFunction(
      "glDeleteProgram",
      (gl, program: GLuint): void => {
        const actualProgram = programs.get(program);
        gl.deleteProgram(actualProgram);
        programs.delete(program);
        for (const [name, uniformIdx] of uniformsByProgram.get(program) ?? []) {
          uniforms.delete(uniformIdx);
        }
        uniformsByProgram.delete(program);
      },
    ),
    glDeleteShader: makeGlFunction(
      "glDeleteShader",
      (gl, shader: GLuint): void => {
        const actualShader = shaders.get(shader);
        gl.deleteShader(actualShader);
        shaders.delete(shader);
      },
    ),
    glDeleteTexture: makeGlFunction(
      "glDeleteTexture",
      (gl, texture: GLuint): void => {
        const actualTexture = textures.get(texture);
        gl.deleteTexture(actualTexture);
        textures.delete(texture);
      },
    ),
    glDeleteVertexArray: makeGlFunction(
      "glDeleteVertexArray",
      (gl, vao: GLuint): void => {
        const actualVao = vaos.get(vao);
        gl.deleteVertexArray(actualVao);
        vaos.delete(vao);
      },
    ),
    glDepthFunc: makeGlFunction("glDepthFunc", (gl, func: GLenum): void => {
      gl.depthFunc(func);
    }),
    glDisable: makeGlFunction("glDisable", (gl, cap: GLenum): void => {
      gl.disable(cap);
    }),
    glDrawArrays: makeGlFunction(
      "glDrawArrays",
      (gl, mode: GLenum, first: GLint, count: GLsizei): void => {
        gl.drawArrays(mode, first, count);
      },
    ),
    glDrawElements: makeGlFunction(
      "glDrawElements",
      (
        gl,
        mode: GLenum,
        count: GLsizei,
        type: GLenum,
        indiciesPtr: number,
      ): void => {
        gl.drawElements(mode, count, type, indiciesPtr);
      },
    ),
    glEnable: makeGlFunction("glEnable", (gl, cap: GLenum): void => {
      gl.enable(cap);
    }),
    glEnableVertexAttribArray: makeGlFunction(
      "glEnableVertexAttribArray",
      (gl, index: GLuint): void => {
        gl.enableVertexAttribArray(index);
      },
    ),
    glFramebufferTexture2D: makeGlFunction(
      "glFramebufferTexture2D",
      (
        gl,
        target: GLenum,
        attachment: GLenum,
        textarget: GLenum,
        textureIndex: GLuint,
        level: GLint,
      ): void => {
        const texture = textures.get(textureIndex);
        gl.framebufferTexture2D(target, attachment, textarget, texture, level);
      },
    ),
    glGetAttribLocation: makeGlFunction(
      "glGetAttribLocation",
      (gl, program: GLuint, namePtr: number): GLint => {
        const name = parseCString(namePtr);
        return gl.getAttribLocation(program, name);
      },
    ),
    glGenBuffers: makeGlFunction(
      "glGenBuffers",
      (gl, count: GLsizei, buffersPtr: number): void => {
        const dataview = new Uint32Array(
          wasmExports.memory.buffer,
          buffersPtr,
          count,
        );
        for (let i = 0; i < count; i++) {
          const idx = buffers.push(gl.createBuffer());
          dataview[i] = idx;
        }
      },
    ),
    glGetBufferParameteriv: makeGlFunction(
      "glGetBufferParameter",
      (gl, target: GLenum, pname: GLenum, data: number) => {
        const dataview = new DataView(wasmExports.memory.buffer, data);
        const value = gl.getBufferParameter(target, pname);
        dataview.setInt32(0, value, true);
      },
    ),
    glGetBufferSubData: makeGlFunction(
      "glGetBufferSubData",
      (
        gl,
        target: GLenum,
        offset: GLintptr,
        size: GLsizeiptr,
        data: number,
      ) => {
        gl.getBufferSubData(
          target,
          Number(offset),
          new Uint8Array(wasmExports.memory.buffer, Number(data), Number(size)),
        );
      },
    ),
    glGenFramebuffers: makeGlFunction(
      "glGenFramebuffers",
      (gl, count: GLsizei, framebuffersPtr: number): void => {
        const dataview = new Uint32Array(
          wasmExports.memory.buffer,
          framebuffersPtr,
          count,
        );
        for (let i = 0; i < count; i++) {
          const idx = framebuffers.push(gl.createFramebuffer());
          dataview[i] = idx;
        }
      },
    ),
    glGenTextures: makeGlFunction(
      "glGenTextures",
      (gl, count: GLsizei, texturesPtr: number): void => {
        const dataview = new Uint32Array(
          wasmExports.memory.buffer,
          texturesPtr,
          count,
        );
        for (let i = 0; i < count; i++) {
          const idx = textures.push(gl.createTexture());
          dataview[i] = idx;
        }
      },
    ),
    glGenVertexArrays: makeGlFunction(
      "glGenVertexArrays",
      (gl, count: GLsizei, vaosPtr: number): void => {
        const dataview = new Uint32Array(
          wasmExports.memory.buffer,
          vaosPtr,
          count,
        );
        for (let i = 0; i < count; i++) {
          const idx = vaos.push(gl.createVertexArray());
          dataview[i] = idx;
        }
      },
    ),
    glGetError: makeGlFunction("glGetError", () => {
      unimplemented("glGetError");
    }),
    glGetProgramInfoLog: makeGlFunction(
      "glGetProgramInfoLog",
      (
        gl,
        programIndex: GLuint,
        maxLength: GLsizei,
        lengthPtr: number,
        infoLogPtr: number,
      ): void => {
        const infoLogOutput = new Uint8Array(
          wasmExports.memory.buffer,
          infoLogPtr,
          maxLength,
        );
        const program = programs.get(programIndex);
        const infoLog = gl.getProgramInfoLog(program) ?? "";
        const written = writeCString(infoLogOutput, infoLog);
        const dataview = new DataView(wasmExports.memory.buffer);
        dataview.setInt32(lengthPtr, written - 1, true);
      },
    ),
    glGetProgramiv: makeGlFunction(
      "glGetProgramiv",
      (gl, programIndex: GLuint, pname: GLenum, params: number) => {
        const dataview = new DataView(wasmExports.memory.buffer, params, 4);
        const program = programs.get(programIndex);
        const result = gl.getProgramParameter(program, pname);
        dataview.setInt32(0, result, true);
      },
    ),
    glGetProgramParameter: makeGlFunction(
      "glGetProgramParameter",
      (gl, programIndex: GLuint, pname: GLenum): GLint => {
        const program = programs.get(programIndex);
        return gl.getProgramParameter(program, pname);
      },
    ),
    glGetShaderInfoLog: makeGlFunction(
      "glGetShaderInfoLog",
      (
        gl,
        shaderIndex: GLuint,
        maxLength: GLsizei,
        lengthPtr: number,
        infoLogPtr: number,
      ): void => {
        const infoLogOutput = new Uint8Array(
          wasmExports.memory.buffer,
          infoLogPtr,
          maxLength,
        );
        const shader = shaders.get(shaderIndex);
        const infoLog = gl.getShaderInfoLog(shader) ?? "";
        const written = writeCString(infoLogOutput, infoLog);
        const dataview = new DataView(wasmExports.memory.buffer);
        dataview.setInt32(lengthPtr, written - 1, true);
      },
    ),
    glGetShaderParameter: makeGlFunction(
      "glGetShaderParameter",
      (gl, shaderIndex: GLuint, pname: GLenum): GLint => {
        const shader = shaders.get(shaderIndex);
        return gl.getShaderParameter(shader, pname);
      },
    ),
    glGetUniformLocation: makeGlFunction(
      "glGetUniformLocation",
      (gl, programIndex: GLuint, namePtr: number): GLint => {
        const name = parseCString(namePtr);
        const programMap = mapUpsert(uniformsByProgram, programIndex, {
          insert() {
            return new Map();
          },
        });
        return mapUpsert(programMap, name, {
          insert() {
            const program = programs.get(programIndex);
            const loc = gl.getUniformLocation(program, name);
            // assert(loc, `Invalid uniform ${name} in program ${programIndex}`);
            return uniforms.push(loc);
          },
        });
      },
    ),
    glLinkProgram: makeGlFunction(
      "glLinkProgram",
      (gl, programIndex: GLuint): void => {
        const program = programs.get(programIndex);
        gl.linkProgram(program);
      },
    ),
    glScissor: makeGlFunction(
      "glScissor",
      (gl, x: GLint, y: GLint, width: GLsizei, height: GLsizei): void => {
        gl.scissor(x, y, width, height);
      },
    ),
    glShaderSource: makeGlFunction(
      "glShaderSource",
      (
        gl,
        shaderIndex: GLuint,
        count: GLsizei,
        stringPtr: number,
        lengthPtr: number,
      ): void => {
        assert(count > 0, "wtf");
        const shader = shaders.get(shaderIndex);
        let src = "";
        const dataview = new DataView(wasmExports.memory.buffer);
        for (let i = 0; i < count; i++) {
          let length: number | undefined = undefined;
          if (lengthPtr !== 0) {
            length = dataview.getInt32(i * 4 + lengthPtr, true);
          }
          src += parseCString(
            dataview.getUint32(i * 4 + stringPtr, true),
            length,
          );
        }
        gl.shaderSource(shader, src);
      },
    ),
    glTexImage2D: makeGlFunction(
      "glTexImage2D",
      (
        gl,
        target: GLenum,
        level: GLint,
        internalformat: GLint,
        width: GLsizei,
        height: GLsizei,
        border: GLint,
        format: GLenum,
        type: GLenum,
        pixelsPtr: number,
      ): void => {
        gl.texImage2D(
          target,
          level,
          internalformat,
          width,
          height,
          border,
          format,
          type,
          new Uint8Array(wasmExports.memory.buffer, pixelsPtr),
        );
      },
    ),
    glTexParameteri: makeGlFunction(
      "glTexParameteri",
      (gl, target: GLenum, pname: GLenum, param: GLint): void => {
        gl.texParameteri(target, pname, param);
      },
    ),
    glUniform1f: makeGlFunction(
      "glUniform1f",
      (gl, locationIndex: GLint, v0: GLfloat): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform1f(location, v0);
      },
    ),
    glUniform1fv: makeGlFunction(
      "glUniform1fv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform1fv(
            location,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count),
          );
      },
    ),
    glUniform1i: makeGlFunction(
      "glUniform1i",
      (gl, locationIndex: GLint, v0: GLint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform1i(location, v0);
      },
    ),
    glUniform1iv: makeGlFunction(
      "glUniform1iv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform1iv(
            location,
            new Int32Array(wasmExports.memory.buffer, valuePtr, count),
          );
      },
    ),
    glUniform1ui: makeGlFunction(
      "glUniform1ui",
      (gl, locationIndex: GLint, v0: GLuint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform1ui(location, v0);
      },
    ),
    glUniform1uiv: makeGlFunction(
      "glUniform1uiv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform1uiv(
            location,
            new Uint32Array(wasmExports.memory.buffer, valuePtr, count),
          );
      },
    ),
    glUniform2f: makeGlFunction(
      "glUniform2f",
      (gl, locationIndex: GLint, v0: GLfloat, v1: GLfloat): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform2f(location, v0, v1);
      },
    ),
    glUniform2fv: makeGlFunction(
      "glUniform2fv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform2fv(
            location,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 2),
          );
      },
    ),
    glUniform2i: makeGlFunction(
      "glUniform2i",
      (gl, locationIndex: GLint, v0: GLint, v1: GLint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform2i(location, v0, v1);
      },
    ),
    glUniform2iv: makeGlFunction(
      "glUniform2iv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform2iv(
            location,
            new Int32Array(wasmExports.memory.buffer, valuePtr, count * 2),
          );
      },
    ),
    glUniform2ui: makeGlFunction(
      "glUniform2ui",
      (gl, locationIndex: GLint, v0: GLuint, v1: GLuint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform2ui(location, v0, v1);
      },
    ),
    glUniform2uiv: makeGlFunction(
      "glUniform2uiv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform2uiv(
            location,
            new Uint32Array(wasmExports.memory.buffer, valuePtr, count * 2),
          );
      },
    ),
    glUniform3f: makeGlFunction(
      "glUniform3f",
      (
        gl,
        locationIndex: GLint,
        v0: GLfloat,
        v1: GLfloat,
        v2: GLfloat,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform3f(location, v0, v1, v2);
      },
    ),
    glUniform3fv: makeGlFunction(
      "glUniform3fv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform3fv(
            location,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 3),
          );
      },
    ),
    glUniform3i: makeGlFunction(
      "glUniform3i",
      (gl, locationIndex: GLint, v0: GLint, v1: GLint, v2: GLint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform3i(location, v0, v1, v2);
      },
    ),
    glUniform3iv: makeGlFunction(
      "glUniform3iv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform3iv(
            location,
            new Int32Array(wasmExports.memory.buffer, valuePtr, count * 3),
          );
      },
    ),
    glUniform3ui: makeGlFunction(
      "glUniform3ui",
      (gl, locationIndex: GLint, v0: GLuint, v1: GLuint, v2: GLuint): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform3ui(location, v0, v1, v2);
      },
    ),
    glUniform3uiv: makeGlFunction(
      "glUniform3uiv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform3uiv(
            location,
            new Uint32Array(wasmExports.memory.buffer, valuePtr, count * 3),
          );
      },
    ),
    glUniform4f: makeGlFunction(
      "glUniform4f",
      (
        gl,
        locationIndex: GLint,
        v0: GLfloat,
        v1: GLfloat,
        v2: GLfloat,
        v3: GLfloat,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform4f(location, v0, v1, v2, v3);
      },
    ),
    glUniform4fv: makeGlFunction(
      "glUniform4fv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform4fv(
            location,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 4),
          );
      },
    ),
    glUniform4i: makeGlFunction(
      "glUniform4i",
      (
        gl,
        locationIndex: GLint,
        v0: GLint,
        v1: GLint,
        v2: GLint,
        v3: GLint,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform4i(location, v0, v1, v2, v3);
      },
    ),
    glUniform4iv: makeGlFunction(
      "glUniform4iv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform4iv(
            location,
            new Int32Array(wasmExports.memory.buffer, valuePtr, count * 4),
          );
      },
    ),
    glUniform4ui: makeGlFunction(
      "glUniform4ui",
      (
        gl,
        locationIndex: GLint,
        v0: GLuint,
        v1: GLuint,
        v2: GLuint,
        v3: GLuint,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location) gl.uniform4ui(location, v0, v1, v2, v3);
      },
    ),
    glUniform4uiv: makeGlFunction(
      "glUniform4uiv",
      (gl, locationIndex: GLint, count: GLsizei, valuePtr: number): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniform4uiv(
            location,
            new Uint32Array(wasmExports.memory.buffer, valuePtr, count * 4),
          );
      },
    ),
    glUniformMatrix2fv: makeGlFunction(
      "glUniformMatrix2fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix2fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 4),
          );
      },
    ),
    glUniformMatrix2x3fv: makeGlFunction(
      "glUniformMatrix2x3fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix2x3fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 6),
          );
      },
    ),
    glUniformMatrix2x4fv: makeGlFunction(
      "glUniformMatrix2x4fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix2x4fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 8),
          );
      },
    ),
    glUniformMatrix3fv: makeGlFunction(
      "glUniformMatrix3fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix3fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 9),
          );
      },
    ),
    glUniformMatrix3x2fv: makeGlFunction(
      "glUniformMatrix3x2fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix3x2fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 6),
          );
      },
    ),
    glUniformMatrix3x4fv: makeGlFunction(
      "glUniformMatrix3x4fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix3x4fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 12),
          );
      },
    ),
    glUniformMatrix4fv: makeGlFunction(
      "glUniformMatrix4fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix4fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 16),
          );
      },
    ),
    glUniformMatrix4x2fv: makeGlFunction(
      "glUniformMatrix4x2fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix4x2fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 8),
          );
      },
    ),
    glUniformMatrix4x3fv: makeGlFunction(
      "glUniformMatrix4x3fv",
      (
        gl,
        locationIndex: GLint,
        count: GLsizei,
        transpose: GLboolean,
        valuePtr: number,
      ): void => {
        const location = uniforms.getWithoutAssert(locationIndex);
        if (location)
          gl.uniformMatrix4x3fv(
            location,
            !!transpose,
            new Float32Array(wasmExports.memory.buffer, valuePtr, count * 12),
          );
      },
    ),
    glUseProgram: makeGlFunction(
      "glUseProgram",
      (gl, programIndex: GLuint): void => {
        const program = programs.get(programIndex);
        gl.useProgram(program);
      },
    ),
    glVertexAttribPointer: makeGlFunction(
      "glVertexAttribPointer",
      (
        gl,
        index: GLuint,
        size: GLint,
        type: GLenum,
        normalized: GLboolean,
        stride: GLsizei,
        offset: GLintptr,
      ): void => {
        gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
      },
    ),
    glViewport: makeGlFunction(
      "glViewport",
      (gl, x: GLint, y: GLint, width: GLsizei, height: GLsizei): void => {
        gl.viewport(x, y, width, height);
      },
    ),
  },
} satisfies WasmInstance;

async function loadWasm(): Promise<void> {
  const results = await WebAssembly.instantiateStreaming(
    fetch("output.wasm"),
    wasmInstance,
  );
  wasmExports = results.instance.exports as WasmExports;
  try {
    const result = wasmExports._start();
    console.info("_start finished with", result);
  } catch (e) {
    if (e instanceof ExitError) {
      console.info(e.message);
      return;
    } else {
      console.error(e);
    }
  }
}

loadWasm().catch(console.error);

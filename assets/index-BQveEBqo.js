var L=Object.defineProperty;var W=(t,e,r)=>e in t?L(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r;var P=(t,e,r)=>W(t,typeof e!="symbol"?e+"":e,r);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const f of i.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&n(f)}).observe(document,{childList:!0,subtree:!0});function r(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=r(o);fetch(o.href,i)}})();function E(t,e,r){if(t.has(e)){const n=t.get(e);if(r.update){const o=r.update(n,e,t);return t.set(e,o),o}return n}else{if(r.insert){const n=r.insert(e,t);return t.set(e,n),n}return}}function A(t,e){if(!t)throw new Error(e)}function p(t){throw new Error(`Unimplemented: ${t}`)}const V=t=>{const e=new Uint8Array(s.memory.buffer,t);let r=0;for(;e[r]!==0;)r+=1;return r+1};function h(t,e){e=e??V(t)-1;const r=new TextDecoder,n=new Uint8Array(s.memory.buffer,t,e);return r.decode(n)}function D(t,e){let n=new TextEncoder().encode(e);return console.assert(n.byteLength<=t.byteLength,"could not fully write into output"),n=n.slice(0,t.byteLength-1),t.set(n),t[n.byteLength]=0,n.byteLength+1}class y{constructor(){P(this,"array",[void 0]);P(this,"freelist",[])}getWithoutAssert(e){const r=this.array[e];return console.assert(!!r,"Invalid element"),r}get(e){const r=this.array[e];return A(r,"Invalid element"),r}push(e){const r=this.create();return this.array[r]=e,r}create(){return this.array.push(void 0)-1}delete(e){this.array[e]=void 0}}let s,c;function S(t){A(t,"Ctx not initialized")}const C=new Map;function T(t,e){let r=!1;for(;;){const n=t.getError();if(r=r&&n===t.NO_ERROR,n!==t.NO_ERROR){const o=E(C,e,{insert(){return 1},update(i){return i+1}});if(o===100)console.info("Gonna skip reporting this error");else if(o>100)continue}switch(n){case t.NO_ERROR:return r;case 0:console.error("getError() returned an error");break;case t.INVALID_ENUM:console.error(`${e}: INVALID_ENUM`);break;case t.INVALID_VALUE:console.error(`${e}: INVALID_VALUE`);break;case t.INVALID_OPERATION:console.error(`${e}: INVALID_OPERATION`);break;case t.INVALID_FRAMEBUFFER_OPERATION:console.error(`${e}: INVALID_FRAMEBUFFER_OPERATION`);break;case t.OUT_OF_MEMORY:console.error(`${e}: OUT_OF_MEMORY`);break;default:console.error(`${e}: Unknown error`,n)}}}const b=new y,U=new y,d=new y,w=new y,v=new y,B=new y,l=new y,_=new Map,I=new y;function a(t,e){function r(...n){S(c),e==null&&p(t);try{return e.call(this,c,...n)}finally{T(c,t)}}return r}class F extends Error{constructor(e){super(`Program exited with code ${e}`),this.code=e}}const G={env:{exit(t){throw new F(t)},breakpoint:function(){debugger},print:function(t){console.log(h(t))},setCurrentWebgl2Canvas(t){const e=h(t),r=document.getElementById(e);r instanceof HTMLCanvasElement?(c=r.getContext("webgl2")??void 0,c==null&&alert("Could not get webgl2 ctx")):alert(`Could not get canvas from ${e}`)},requestAnimationFrameLoop(t){let e=s.__indirect_function_table.get(t),r=performance.now();function n(){const o=performance.now(),i=Math.max(o-r,2/60);r=o;try{const f=e(i/1e3);if(!f)return;typeof f=="number"&&(e=s.__indirect_function_table.get(f)),requestAnimationFrame(n)}catch(f){f instanceof F?console.info(f.message):console.error(f)}}requestAnimationFrame(n)},sinf(t){return Math.sin(t)},cosf(t){return Math.cos(t)},sqrtf(t){return Math.sqrt(t)},onKeyDown(t,e){const r=s.__indirect_function_table.get(e);document.body.addEventListener("keydown",n=>{const o=new Uint8Array(s.memory.buffer,t,32),i=n.code;D(o,i),r()})},onKeyUp(t,e){const r=s.__indirect_function_table.get(e);document.body.addEventListener("keyup",n=>{const o=new Uint8Array(s.memory.buffer,t,32),i=n.code;D(o,i),r()})},onWindowResize(t){const e=window.devicePixelRatio,r=s.__indirect_function_table.get(t);c&&(c.canvas.width=window.innerWidth*e,c.canvas.height=window.innerHeight*e,r(c.canvas.width,c.canvas.height)),window.addEventListener("resize",()=>{c&&(c.canvas.width=window.innerWidth*e,c.canvas.height=window.innerHeight*e,r(c.canvas.width,c.canvas.height))})},time:t=>{const e=BigInt(Date.now())/1000n;return t&&new DataView(s.memory.buffer,t,8).setBigUint64(0,e,!0),e},time_ms:t=>{const e=BigInt(Date.now());return t&&new DataView(s.memory.buffer,t,8).setBigUint64(0,e,!0),e},monotonic_time(){return performance.now()},send_img_request:(t,e)=>{const r=h(t),n={status:"pending",promise:new Promise((i,f)=>{const u=document.createElement("img"),g=document.createElement("canvas"),m=g.getContext("2d");A(m,"failed to create 2d canvas"),u.addEventListener("load",async()=>{try{if(u.naturalWidth===0)n.status="failure",f();else{const x=await createImageBitmap(u);g.width=u.naturalWidth,g.height=u.naturalHeight,m.drawImage(x,0,0,x.width,x.height);const M=m.getImageData(0,0,x.width,x.height,{colorSpace:"srgb"});n.width=u.naturalWidth,n.height=u.naturalHeight,n.bytes=M.data,n.status="success",i()}}catch{n.status="failure",f()}}),u.src=r})},o=I.push(n);return e&&n.promise.then(()=>{s.__indirect_function_table.get(e)(o)}),o},check_img_response:(t,e,r,n)=>{const o=I.get(t);switch(o.status){case"pending":return 1;case"failure":return-1;case"success":A(o.width,"Request was marked as successful but width is empty"),A(o.height,"Request was marked as successful but height is empty"),A(o.bytes,"Request was marked as successful but bytes is empty");const i=s.walloc(o.bytes.byteLength);new Uint8Array(s.memory.buffer,i,o.bytes.byteLength).set(o.bytes);const u=new DataView(s.memory.buffer);return u.setFloat32(e,o.width,!0),u.setFloat32(r,o.height,!0),u.setUint32(n,i,!0),0}},read(t,e,r){p("read")},write(t,e,r){switch(t){case 0:p("Tried to write into stdin");break;case 1:{const n=h(e,r);return console.log(n),n.length+1}case 2:{const n=h(e,r);return console.error(n),n.length+1}default:p("Tried to write into a random file")}}},webgl:{glActiveTexture:a("glActiveTexture",(t,e)=>{t.activeTexture(e)}),glAttachShader:a("glAttachShader",(t,e,r)=>{const n=d.get(e),o=w.get(r);t.attachShader(n,o)}),glBindBuffer:a("glBindBuffer",(t,e,r)=>{const n=b.get(r);t.bindBuffer(e,n)}),glBindFrameBuffer:a("glBindFrameBuffer",(t,e,r)=>{const n=U.get(r);t.bindFramebuffer(e,n)}),glBindTexture:a("glBindTexture",(t,e,r)=>{const n=v.get(r);t.bindTexture(e,n)}),glBindVertexArray:a("glBindVertexArray",(t,e)=>{const r=B.get(e);t.bindVertexArray(r)}),glBlendEquation:a("glBlendEquation",(t,e)=>{t.blendEquation(e)}),glBlendFunc:a("glBlendFunc",(t,e,r)=>{t.blendFunc(e,r)}),glBufferData:a("glBufferData",(t,e,r,n,o)=>{const i=new Uint8Array(s.memory.buffer,n,Number(r));t.bufferData(e,i,o)}),glBufferSubData:a("glBufferSubData",(t,e,r,n,o)=>{const i=new Uint8Array(s.memory.buffer,o,Number(n));t.bufferSubData(e,r,i)}),glClear:a("glClear",(t,e)=>{t.clear(e)}),glClearColor:a("glClearColor",(t,e,r,n,o)=>{t.clearColor(e,r,n,o)}),glClearDepth:a("glClearDepth",(t,e)=>{t.clearDepth(e)}),glCompileShader:a("glCompileShader",(t,e)=>{const r=w.get(e);t.compileShader(r)}),glCreateBuffer:a("glCreateBuffer",t=>b.push(t.createBuffer())),glCreateFrameBuffer:a("glCreateFrameBuffer",t=>U.push(t.createFramebuffer())),glCreateProgram:a("glCreateProgram",t=>d.push(t.createProgram())),glCreateShader:a("glCreateShader",(t,e)=>{const r=t.createShader(e);return r?w.push(r):0}),glCreateTexture:a("glCreateTexture",t=>v.push(t.createTexture())),glCreateVertexArray:a("glCreateVertexArray",t=>v.push(t.createVertexArray())),glDeleteBuffer:a("glDeleteBuffer",(t,e)=>{const r=b.get(e);t.deleteBuffer(r),b.delete(e)}),glDeleteBuffers:a("glDeleteBuffers",(t,e,r)=>{const n=new DataView(s.memory.buffer,r);for(let o=0;o<e;o++){const i=n.getUint32(o*4),f=b.get(i);t.deleteBuffer(f),b.delete(i)}}),glDeleteFrameBuffer:a("glDeleteFrameBuffer",(t,e)=>{const r=U.get(e);t.deleteFramebuffer(r),U.delete(e)}),glDeleteProgram:a("glDeleteProgram",(t,e)=>{const r=d.get(e);t.deleteProgram(r),d.delete(e);for(const[n,o]of _.get(e)??[])l.delete(o);_.delete(e)}),glDeleteShader:a("glDeleteShader",(t,e)=>{const r=w.get(e);t.deleteShader(r),w.delete(e)}),glDeleteTexture:a("glDeleteTexture",(t,e)=>{const r=v.get(e);t.deleteTexture(r),v.delete(e)}),glDeleteVertexArray:a("glDeleteVertexArray",(t,e)=>{const r=B.get(e);t.deleteVertexArray(r),B.delete(e)}),glDepthFunc:a("glDepthFunc",(t,e)=>{t.depthFunc(e)}),glDisable:a("glDisable",(t,e)=>{t.disable(e)}),glDrawArrays:a("glDrawArrays",(t,e,r,n)=>{t.drawArrays(e,r,n)}),glDrawElements:a("glDrawElements",(t,e,r,n,o)=>{t.drawElements(e,r,n,o)}),glEnable:a("glEnable",(t,e)=>{t.enable(e)}),glEnableVertexAttribArray:a("glEnableVertexAttribArray",(t,e)=>{t.enableVertexAttribArray(e)}),glFramebufferTexture2D:a("glFramebufferTexture2D",(t,e,r,n,o,i)=>{const f=v.get(o);t.framebufferTexture2D(e,r,n,f,i)}),glGetAttribLocation:a("glGetAttribLocation",(t,e,r)=>{const n=h(r);return t.getAttribLocation(e,n)}),glGenBuffers:a("glGenBuffers",(t,e,r)=>{const n=new Uint32Array(s.memory.buffer,r,e);for(let o=0;o<e;o++){const i=b.push(t.createBuffer());n[o]=i}}),glGetBufferParameteriv:a("glGetBufferParameter",(t,e,r,n)=>{const o=new DataView(s.memory.buffer,n),i=t.getBufferParameter(e,r);o.setInt32(0,i,!0)}),glGetBufferSubData:a("glGetBufferSubData",(t,e,r,n,o)=>{t.getBufferSubData(e,Number(r),new Uint8Array(s.memory.buffer,Number(o),Number(n)))}),glGenFramebuffers:a("glGenFramebuffers",(t,e,r)=>{const n=new Uint32Array(s.memory.buffer,r,e);for(let o=0;o<e;o++){const i=U.push(t.createFramebuffer());n[o]=i}}),glGenTextures:a("glGenTextures",(t,e,r)=>{const n=new Uint32Array(s.memory.buffer,r,e);for(let o=0;o<e;o++){const i=v.push(t.createTexture());n[o]=i}}),glGenVertexArrays:a("glGenVertexArrays",(t,e,r)=>{const n=new Uint32Array(s.memory.buffer,r,e);for(let o=0;o<e;o++){const i=B.push(t.createVertexArray());n[o]=i}}),glGetError:a("glGetError",()=>{p("glGetError")}),glGetProgramInfoLog:a("glGetProgramInfoLog",(t,e,r,n,o)=>{const i=new Uint8Array(s.memory.buffer,o,r),f=d.get(e),u=t.getProgramInfoLog(f)??"",g=D(i,u);new DataView(s.memory.buffer).setInt32(n,g-1,!0)}),glGetProgramiv:a("glGetProgramiv",(t,e,r,n)=>{const o=new DataView(s.memory.buffer,n,4),i=d.get(e),f=t.getProgramParameter(i,r);o.setInt32(0,f,!0)}),glGetProgramParameter:a("glGetProgramParameter",(t,e,r)=>{const n=d.get(e);return t.getProgramParameter(n,r)}),glGetShaderInfoLog:a("glGetShaderInfoLog",(t,e,r,n,o)=>{const i=new Uint8Array(s.memory.buffer,o,r),f=w.get(e),u=t.getShaderInfoLog(f)??"",g=D(i,u);new DataView(s.memory.buffer).setInt32(n,g-1,!0)}),glGetShaderParameter:a("glGetShaderParameter",(t,e,r)=>{const n=w.get(e);return t.getShaderParameter(n,r)}),glGetUniformLocation:a("glGetUniformLocation",(t,e,r)=>{const n=h(r),o=E(_,e,{insert(){return new Map}});return E(o,n,{insert(){const i=d.get(e),f=t.getUniformLocation(i,n);return l.push(f)}})}),glLinkProgram:a("glLinkProgram",(t,e)=>{const r=d.get(e);t.linkProgram(r)}),glPixelStorei:a("glPixelStorei",(t,e,r)=>{t.pixelStorei(e,r)}),glScissor:a("glScissor",(t,e,r,n,o)=>{t.scissor(e,r,n,o)}),glShaderSource:a("glShaderSource",(t,e,r,n,o)=>{A(r>0,"wtf");const i=w.get(e);let f="";const u=new DataView(s.memory.buffer);for(let g=0;g<r;g++){let m;o!==0&&(m=u.getInt32(g*4+o,!0)),f+=h(u.getUint32(g*4+n,!0),m)}t.shaderSource(i,f)}),glTexImage2D:a("glTexImage2D",(t,e,r,n,o,i,f,u,g,m)=>{t.texImage2D(e,r,n,o,i,f,u,g,new Uint8Array(s.memory.buffer,m))}),glTexParameteri:a("glTexParameteri",(t,e,r,n)=>{t.texParameteri(e,r,n)}),glUniform1f:a("glUniform1f",(t,e,r)=>{const n=l.getWithoutAssert(e);n&&t.uniform1f(n,r)}),glUniform1fv:a("glUniform1fv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform1fv(o,new Float32Array(s.memory.buffer,n,r))}),glUniform1i:a("glUniform1i",(t,e,r)=>{const n=l.getWithoutAssert(e);n&&t.uniform1i(n,r)}),glUniform1iv:a("glUniform1iv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform1iv(o,new Int32Array(s.memory.buffer,n,r))}),glUniform1ui:a("glUniform1ui",(t,e,r)=>{const n=l.getWithoutAssert(e);n&&t.uniform1ui(n,r)}),glUniform1uiv:a("glUniform1uiv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform1uiv(o,new Uint32Array(s.memory.buffer,n,r))}),glUniform2f:a("glUniform2f",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2f(o,r,n)}),glUniform2fv:a("glUniform2fv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2fv(o,new Float32Array(s.memory.buffer,n,r*2))}),glUniform2i:a("glUniform2i",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2i(o,r,n)}),glUniform2iv:a("glUniform2iv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2iv(o,new Int32Array(s.memory.buffer,n,r*2))}),glUniform2ui:a("glUniform2ui",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2ui(o,r,n)}),glUniform2uiv:a("glUniform2uiv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform2uiv(o,new Uint32Array(s.memory.buffer,n,r*2))}),glUniform3f:a("glUniform3f",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniform3f(i,r,n,o)}),glUniform3fv:a("glUniform3fv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform3fv(o,new Float32Array(s.memory.buffer,n,r*3))}),glUniform3i:a("glUniform3i",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniform3i(i,r,n,o)}),glUniform3iv:a("glUniform3iv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform3iv(o,new Int32Array(s.memory.buffer,n,r*3))}),glUniform3ui:a("glUniform3ui",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniform3ui(i,r,n,o)}),glUniform3uiv:a("glUniform3uiv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform3uiv(o,new Uint32Array(s.memory.buffer,n,r*3))}),glUniform4f:a("glUniform4f",(t,e,r,n,o,i)=>{const f=l.getWithoutAssert(e);f&&t.uniform4f(f,r,n,o,i)}),glUniform4fv:a("glUniform4fv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform4fv(o,new Float32Array(s.memory.buffer,n,r*4))}),glUniform4i:a("glUniform4i",(t,e,r,n,o,i)=>{const f=l.getWithoutAssert(e);f&&t.uniform4i(f,r,n,o,i)}),glUniform4iv:a("glUniform4iv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform4iv(o,new Int32Array(s.memory.buffer,n,r*4))}),glUniform4ui:a("glUniform4ui",(t,e,r,n,o,i)=>{const f=l.getWithoutAssert(e);f&&t.uniform4ui(f,r,n,o,i)}),glUniform4uiv:a("glUniform4uiv",(t,e,r,n)=>{const o=l.getWithoutAssert(e);o&&t.uniform4uiv(o,new Uint32Array(s.memory.buffer,n,r*4))}),glUniformMatrix2fv:a("glUniformMatrix2fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix2fv(i,!!n,new Float32Array(s.memory.buffer,o,r*4))}),glUniformMatrix2x3fv:a("glUniformMatrix2x3fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix2x3fv(i,!!n,new Float32Array(s.memory.buffer,o,r*6))}),glUniformMatrix2x4fv:a("glUniformMatrix2x4fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix2x4fv(i,!!n,new Float32Array(s.memory.buffer,o,r*8))}),glUniformMatrix3fv:a("glUniformMatrix3fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix3fv(i,!!n,new Float32Array(s.memory.buffer,o,r*9))}),glUniformMatrix3x2fv:a("glUniformMatrix3x2fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix3x2fv(i,!!n,new Float32Array(s.memory.buffer,o,r*6))}),glUniformMatrix3x4fv:a("glUniformMatrix3x4fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix3x4fv(i,!!n,new Float32Array(s.memory.buffer,o,r*12))}),glUniformMatrix4fv:a("glUniformMatrix4fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix4fv(i,!!n,new Float32Array(s.memory.buffer,o,r*16))}),glUniformMatrix4x2fv:a("glUniformMatrix4x2fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix4x2fv(i,!!n,new Float32Array(s.memory.buffer,o,r*8))}),glUniformMatrix4x3fv:a("glUniformMatrix4x3fv",(t,e,r,n,o)=>{const i=l.getWithoutAssert(e);i&&t.uniformMatrix4x3fv(i,!!n,new Float32Array(s.memory.buffer,o,r*12))}),glUseProgram:a("glUseProgram",(t,e)=>{const r=d.get(e);t.useProgram(r)}),glVertexAttribPointer:a("glVertexAttribPointer",(t,e,r,n,o,i,f)=>{t.vertexAttribPointer(e,r,n,o,i,f)}),glViewport:a("glViewport",(t,e,r,n,o)=>{t.viewport(e,r,n,o)})}};async function O(){s=(await WebAssembly.instantiateStreaming(fetch("output.wasm"),G)).instance.exports;try{const e=s._start();console.info("_start finished with",e)}catch(e){if(e instanceof F){console.info(e.message);return}else console.error(e)}}O().catch(console.error);

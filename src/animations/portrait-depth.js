// Depth-map displacement keeps the foreground moving independently of the background.
// Use native WebGL so the portrait does not depend on a remote graphics library.
export function initPortraitDepth(container) {
  let disposed = false;
  const controller = new AbortController();
  let observer;
  const textures = [],
    shaders = [];
  let buffer;
  const fallback = container.querySelector("img");
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) return { render() {}, destroy() {} };
  let program,
    image,
    ready = false,
    pointer = [0, 0];
  function compile(type, source) {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error("Portrait shader compilation failed");
    return shader;
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const asset = new Image();
      asset.onload = () => resolve(asset);
      asset.onerror = reject;
      asset.src = url;
    });
  }
  function texture(asset, unit, name) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const imageTexture = gl.createTexture();
    textures.push(imageTexture);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, name), unit);
  }
  function render(nx = pointer[0], ny = pointer[1]) {
    pointer = [nx, ny];
    if (!ready || disposed) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gl.uniform2f(
      gl.getUniformLocation(program, "u_mouse"),
      reduced ? 0 : nx,
      reduced ? 0 : -ny,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function resize() {
    if (!ready) return;
    const { width, height } = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const screenAspect = width / height;
    const imageAspect = image.width / image.height;
    const sx = Math.min(1, screenAspect / imageAspect);
    const sy = Math.min(1, imageAspect / screenAspect);
    // Keep the source's top edge visible; crop any excess height from the bottom.
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    gl.uniform2f(gl.getUniformLocation(program, "u_scale"), sx, sy);
    gl.uniform2f(
      gl.getUniformLocation(program, "u_offset"),
      (1 - sx) * (mobile ? 0.64 : 0.5),
      1 - sy,
    );
    render();
  }
  Promise.all([
    loadImage("assets/images/portrait.webp"),
    loadImage("assets/images/portrait-depth.png"),
  ])
    .then(([photo, depth]) => {
      if (disposed) return;
      image = photo;
      program = gl.createProgram();
      gl.attachShader(
        program,
        compile(
          gl.VERTEX_SHADER,
          `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main(){ v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
    `,
        ),
      );
      gl.attachShader(
        program,
        compile(
          gl.FRAGMENT_SHADER,
          `
      precision mediump float;
      uniform sampler2D u_image;
      uniform sampler2D u_depth;
      uniform vec2 u_mouse, u_scale, u_offset;
      varying vec2 v_uv;
      void main(){
        vec2 uv = v_uv * u_scale + u_offset;
        uv.x = 1. - uv.x;
        // Horizontal overscan avoids edge smearing without cropping the head.
        uv.x = (uv.x - .5) * .96 + .5;
        float depth = smoothstep(.05, .95, texture2D(u_depth, uv).r);
        vec2 movement = vec2(-u_mouse.x, u_mouse.y) * .018 * depth;
        vec3 color = texture2D(u_image, uv - movement).rgb;
        float gray = dot(color, vec3(.299, .587, .114));
        gl_FragColor = vec4(vec3(gray), 1.);
      }
    `,
        ),
      );
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Portrait shader linking failed");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture(photo, 0, "u_image");
      texture(depth, 1, "u_depth");
      container.appendChild(canvas);
      ready = true;
      resize();
      container.classList.add("depth-ready");
      observer = new ResizeObserver(resize);
      observer.observe(container);
      canvas.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          ready = false;
          container.classList.remove("depth-ready");
        },
        { signal: controller.signal },
      );
    })
    .catch(() => {
      if (disposed) return;
      container.classList.remove("depth-ready");
      canvas.remove();
      fallback.style.visibility = "visible";
    });
  return {
    render,
    destroy() {
      disposed = true;
      ready = false;
      controller.abort();
      observer?.disconnect();
      textures.forEach((texture) => gl.deleteTexture(texture));
      shaders.forEach((shader) => gl.deleteShader(shader));
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      canvas.remove();
      container.classList.remove("depth-ready");
      fallback.style.removeProperty("visibility");
    },
  };
}

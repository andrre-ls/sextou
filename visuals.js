// Beat-locked plasma. sextou.mp3 is 170 BPM and exactly 400 beats long
// (141.18s, 100 bars of 4/4, no leading silence), so the downbeat is t=0.
const BEAT = 60 / 170;

// Club-lighting palette. Every entry clears 5:1 against white text.
const PALETTE = [
  [0.71, 0.0, 0.43],
  [0.36, 0.12, 0.66],
  [0.07, 0.24, 0.62],
  [0.0, 0.44, 0.49],
  [0.31, 0.48, 0.0],
  [0.66, 0.31, 0.0],
  [0.69, 0.07, 0.21],
  [0.48, 0.11, 0.55],
];

const VERT = `#version 300 es
void main() {
  // Fullscreen triangle from gl_VertexID. No buffers, no attributes.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_res;
uniform float u_beat;      // continuous beats since the downbeat at t=0
uniform vec3  u_pal[8];

out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),               hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y) * 1.6;

  float t = u_beat * 0.25;
  // Cubic decay envelope: hits on the beat, falls off before the next one.
  // Smooth rather than a hard cut, which keeps the luminance swing gentle.
  float pulse = pow(1.0 - fract(u_beat), 3.0);

  // Two-level domain warp. The beat opens up the second warp amplitude,
  // so the field churns harder on the downbeat and settles between beats.
  vec2 q = vec2(fbm(p + vec2(0.0, t)),
                fbm(p + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p + (2.0 + pulse * 2.5) * r);

  // Hue steps once per bar; +3 gives a wide jump so the two ends stay distinct.
  int bi = int(mod(floor(u_beat / 4.0), 8.0));
  vec3 col = mix(u_pal[bi], u_pal[(bi + 3) % 8], smoothstep(0.15, 0.85, f));

  col += 0.35 * pulse * f;        // beat lift
  col += 0.15 * length(r);        // warp highlights

  // Darken the centre so the text always has something to sit on.
  col *= mix(0.5, 1.05, smoothstep(0.0, 0.75, length(p) * 0.6));

  // Dither by one 8-bit step to kill banding in the smooth gradients.
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

  fragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function createVisuals(audio) {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.id = "visuals";
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) {
    return console.error("WebGL2 not supported");
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
  }

  gl.useProgram(prog);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uBeat = gl.getUniformLocation(prog, "u_beat");
  gl.uniform3fv(gl.getUniformLocation(prog, "u_pal[0]"), PALETTE.flat());

  function resize() {
    // Five-octave fBm three times per pixel: cap DPR rather than render 4K.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }

  let active = false;

  function draw(beat) {
    gl.uniform1f(uBeat, beat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Beats come off audio.currentTime, not a wall clock, so the plasma tracks
  // the track itself and cannot drift or desync across 141 seconds.
  function frame() {
    if (!active) return;
    resize();
    draw(audio.currentTime / BEAT);
    requestAnimationFrame(frame);
  }

  return {
    start() {
      if (active) return;
      resize();
      document.body.dataset.visuals = "";
      if (calm) {
        draw(0); // One static frame: the room is lit, it just doesn't move.
        return;
      }
      active = true;
      requestAnimationFrame(frame);
    },
    stop() {
      active = false;
      delete document.body.dataset.visuals;
    },
  };
}

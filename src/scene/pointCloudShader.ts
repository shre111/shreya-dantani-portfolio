/**
 * Shaders for the morphing point cloud.
 *
 * Positions are never touched on the CPU after boot. Every shape lives in a
 * float texture atlas; the vertex shader fetches two slots and mixes between
 * them with a per-point stagger, so 130k points reorganise for the cost of one
 * uniform update per frame.
 */

/** Ashima / Stefan Gustavson simplex noise, trimmed to the 3D case. */
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Three decorrelated noise samples. Not strictly divergence-free like true curl
// noise, but visually equivalent here at a third of the cost.
vec3 flow(vec3 p) {
  return vec3(
    snoise(p),
    snoise(p + vec3(31.416, 17.234, 5.772)),
    snoise(p + vec3(-9.113, 44.317, 23.886))
  );
}
`

export const vertexShader = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uShapeCount;
uniform float uShapeA;
uniform float uShapeB;
uniform float uMorph;
uniform float uTime;
uniform float uScatter;
uniform float uTwist;
uniform float uBurstOut;
uniform float uSize;
uniform float uPixelRatio;
uniform float uReveal;
uniform float uBreathe;
uniform vec2  uPointer;
uniform float uParallax;

// Cursor force field, in world space.
uniform vec3  uCursor;
uniform vec3  uViewDir;
uniform float uCursorPush;
uniform float uCursorSwirl;
uniform float uCursorRadius;

attribute vec2 aUv;
attribute float aSeed;

varying float vEmphasis;
varying float vFade;
varying float vSpark;
varying float vEnergy;

${SIMPLEX}

vec4 fetchShape(float shape) {
  return texture2D(uAtlas, vec2(aUv.x, (aUv.y + shape) / uShapeCount));
}

void main() {
  vec4 A = fetchShape(uShapeA);
  vec4 B = fetchShape(uShapeB);

  // Per-point stagger: points start moving at different times, so the cloud
  // flows between shapes instead of snapping as one rigid body.
  float stagger = 0.42;
  float t = clamp((uMorph - aSeed * stagger) / (1.0 - stagger), 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  vec3 pos = mix(A.xyz, B.xyz, t);
  float emphasis = mix(A.w, B.w, t);

  float burst = sin(t * 3.14159265);

  // --- transition physics -------------------------------------------------
  // Three forces stack mid-morph so the cloud does not merely drift between
  // shapes: it shears apart, throws itself outward, and boils.

  // 1. shear — a twist about the view-up axis, stronger further from centre
  float ang = burst * uTwist * (0.35 + length(pos.xz) * 0.075);
  float ca = cos(ang);
  float sa = sin(ang);
  pos.xz = mat2(ca, -sa, sa, ca) * pos.xz;

  // 2. detonation — points fly out along their own radius, then fall back
  vec3 radial = normalize(pos + vec3(0.0001, 0.0001, 0.0001));
  pos += radial * burst * uBurstOut * (0.35 + aSeed * 1.3);

  // 3. turbulence
  pos += flow(pos * 0.16 + uTime * 0.06) * (burst * uScatter * (0.45 + aSeed * 1.1));

  // A settled shape still breathes, so it never reads as a static image.
  pos += flow(pos * 0.09 - uTime * 0.03) * uBreathe;

  // --- cursor force field --------------------------------------------------
  // A gaussian well travelling with the pointer. Points shove away from it and
  // spin around the view axis, so moving the mouse carves a visible wake.
  vec3 toPoint = pos - uCursor;
  float cd = length(toPoint);
  float infl = exp(-(cd * cd) / (2.0 * uCursorRadius * uCursorRadius));
  vec3 away = toPoint / max(cd, 0.001);

  pos += away * infl * uCursorPush * (0.8 + aSeed * 0.4);
  pos += cross(uViewDir, toPoint) * infl * uCursorSwirl;

  // A whole-cloud tilt toward the pointer, leaned by depth so it reads as
  // parallax. Deliberately NOT scaled by aSeed: a per-point random offset
  // does not move the shape, it smears it, and the smear never lets up
  // because the cursor is essentially always off-centre.
  float depthLean = 0.7 + 0.3 * clamp(pos.z * 0.11 + 0.5, 0.0, 1.0);
  pos.x += uPointer.x * uParallax * depthLean;
  pos.y -= uPointer.y * uParallax * depthLean * 0.7;

  // Boot: points converge from a far shell into the first shape.
  vec3 birth = normalize(pos + vec3(0.0001, 0.0001, 0.0001)) * 46.0;
  pos = mix(birth, pos, uReveal);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(-mv.z, 0.6);
  float swell = 1.0 + burst * 0.75 + infl * 0.45;
  gl_PointSize =
    clamp(uSize * uPixelRatio * (1.0 + emphasis * 0.6) * swell * (18.0 / dist), 0.5, 30.0);

  vEmphasis = emphasis;
  vFade = smoothstep(78.0, 9.0, dist) * uReveal;
  vSpark = burst;
  vEnergy = infl;
}
`

export const fragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uHot;
uniform float uOpacity;

varying float vEmphasis;
varying float vFade;
varying float vSpark;
varying float vEnergy;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;

  float halo = pow(1.0 - d, 2.2);
  float core = pow(1.0 - d, 14.0);

  vec3 col = mix(uInk, uAccent, clamp(vEmphasis, 0.0, 1.0));
  // transitions run hot, and so does whatever the cursor is disturbing
  col = mix(col, uHot, clamp(vSpark * 0.72 + vEnergy * 0.35, 0.0, 1.0));
  col += core * 0.55;

  // points under the cursor also brighten, so the wake reads even where the
  // displacement alone would be too subtle to notice
  float alpha = (halo * 0.5 + core * 0.95) * uOpacity * vFade * (1.0 + vEnergy * 0.6);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(col, alpha);
}
`

export const glassVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec4 vClipPos;

  void main() {
    vUv = uv;
    vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = vClipPos;
  }
`;

export const glassFragmentShader = /* glsl */ `
  uniform sampler2D tBackground;
  uniform sampler2D tNormal;
  uniform sampler2D tEnv;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uTime;

  varying vec2 vUv;
  varying vec4 vClipPos;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float rrSDF(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec2 envMapEquirect(vec3 dir) {
    dir = normalize(dir);
    float u = atan(dir.z, dir.x) * 0.15915494309 + 0.5;
    float v = acos(clamp(dir.y, -1.0, 1.0)) * 0.31830988618;
    return vec2(u, v);
  }

  vec3 sampleBackground(vec2 uv, vec2 axis, float radius) {
    vec2 tangent = vec2(-axis.y, axis.x);
    vec3 c = texture2D(tBackground, uv).rgb * 0.30;
    c += texture2D(tBackground, uv + axis * radius).rgb * 0.16;
    c += texture2D(tBackground, uv - axis * radius).rgb * 0.16;
    c += texture2D(tBackground, uv + tangent * radius * 0.72).rgb * 0.13;
    c += texture2D(tBackground, uv - tangent * radius * 0.72).rgb * 0.13;
    c += texture2D(tBackground, uv + axis * radius * 1.85).rgb * 0.06;
    c += texture2D(tBackground, uv - axis * radius * 1.85).rgb * 0.06;
    return c;
  }

  void main() {
    vec2 screenUV = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;
    vec2 localPx = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;

    float radius = max(uRadius, 2.0);
    float sdf = rrSDF(localPx, halfSize, radius);
    float mask = 1.0 - smoothstep(-1.0, 1.0, sdf);
    if (mask < 0.01) discard;

    float px = 1.15;
    float sx1 = rrSDF(localPx + vec2(px, 0.0), halfSize, radius);
    float sx0 = rrSDF(localPx - vec2(px, 0.0), halfSize, radius);
    float sy1 = rrSDF(localPx + vec2(0.0, px), halfSize, radius);
    float sy0 = rrSDF(localPx - vec2(0.0, px), halfSize, radius);
    vec2 sdfNormal2 = normalize(vec2(sx1 - sx0, sy1 - sy0) + vec2(0.0001));

    vec2 delta = vUv - 0.5;
    float dist = length(delta);
    float t = uTime * 0.075;

    vec2 normalUv = vUv;
    normalUv += vec2(sin(uTime * 0.033), cos(uTime * 0.029)) * 0.018;
    normalUv += delta * 0.035;
    vec3 textureNormal = texture2D(tNormal, normalUv).rgb * 2.0 - 1.0;
    textureNormal.xy *= vec2(0.38, 0.32);

    float rim = pow(clamp(1.0 - smoothstep(0.0, 16.0, -sdf), 0.0, 1.0), 1.85);
    float bevel = smoothstep(-30.0, 0.0, sdf) * (1.0 - smoothstep(0.0, 3.0, sdf));
    float cornerMass = pow(max(abs(delta.x), abs(delta.y)) * 2.0, 3.25) * 0.18;
    float centerLens = smoothstep(0.02, 0.64, dist) * 0.18;
    float thickness = clamp(rim * 1.02 + bevel * 0.28 + centerLens + cornerMass, 0.0, 1.36);

    vec3 shapedNormal = normalize(vec3(
      sdfNormal2 * (0.62 * rim + 0.26 * bevel) + textureNormal.xy * (0.08 + thickness * 0.14),
      1.0 - thickness * 0.12
    ));

    float liquidX = noise(vUv * vec2(3.1, 1.8) + vec2(t, 0.0)) - 0.5;
    float liquidY = noise(vUv * vec2(1.7, 3.3) + vec2(0.0, t * 1.31)) - 0.5;
    vec2 liquidWarp = vec2(liquidX, liquidY) * (0.0018 + rim * 0.0038);

    vec2 lensDir = normalize(delta + vec2(0.0001));
    float iorBend = 0.014 + thickness * 0.018;
    vec2 refraction = lensDir * thickness * iorBend + shapedNormal.xy * (0.008 + thickness * 0.013) + liquidWarp;
    refraction = clamp(refraction, vec2(-0.038), vec2(0.038));

    vec2 edgeInset = vec2(14.0) / uSize;
    vec2 safeScreenUV = clamp(screenUV + refraction, edgeInset, 1.0 - edgeInset);
    vec2 blurAxis = normalize(refraction + shapedNormal.xy * 0.02 + vec2(0.0001));
    float blurRadius = 0.0012 + thickness * 0.0055 + rim * 0.0065;
    vec3 refracted = sampleBackground(safeScreenUV, blurAxis, blurRadius);

    float dispersion = 0.003 + thickness * 0.0055 + rim * 0.0035;
    refracted.r = texture2D(tBackground, clamp(safeScreenUV + blurAxis * dispersion, edgeInset, 1.0 - edgeInset)).r;
    refracted.b = texture2D(tBackground, clamp(safeScreenUV - blurAxis * dispersion, edgeInset, 1.0 - edgeInset)).b;

    refracted = (refracted - 0.5) * (1.08 + rim * 0.06) + 0.5;
    refracted *= vec3(0.97, 0.985, 1.025);

    vec3 viewDir = normalize(vec3(delta * 0.82, 1.05));
    vec3 reflectDir = reflect(-viewDir, shapedNormal);
    vec3 envRaw = texture2D(tEnv, envMapEquirect(reflectDir)).rgb;
    vec3 env = pow(max(envRaw, vec3(0.0)), vec3(3.2));
    float envPeak = clamp(max(max(env.r, env.g), env.b), 0.0, 1.0);
    float specMask = smoothstep(0.95, 1.85, envPeak);

    float topRim = smoothstep(0.82, 0.94, vUv.y) * (1.0 - smoothstep(0.965, 1.0, vUv.y));
    float bottomRim = smoothstep(0.18, 0.05, vUv.y);
    float sideRim = smoothstep(0.84, 0.98, abs(delta.x) * 2.0);
    float contourSpec = pow(clamp(abs(shapedNormal.x) + abs(shapedNormal.y), 0.0, 1.0), 5.8);
    float sliced = pow(noise(vec2(vUv.x * 7.5, vUv.y * 1.2) + t * 0.18), 7.0);
    float lineSpec = (topRim * 1.35 + sideRim * 0.45 + contourSpec * 0.72) * (0.72 + sliced * 1.3);
    lineSpec *= 1.0 - smoothstep(0.76, 0.98, vUv.x) * 0.72;

    float backShadow = bottomRim * (0.18 + rim * 0.18) + rim * 0.035;
    float fresnel = pow(clamp(1.0 - dot(viewDir, shapedNormal), 0.0, 1.0), 2.15);
    vec3 rimColor = vec3(0.94, 0.98, 1.0) * (rim * 0.20 + fresnel * 0.24);

    float iriPhase = dist * 6.6 + thickness * 2.2 + t * 0.55;
    vec3 iri = vec3(
      sin(iriPhase) * 0.5 + 0.5,
      sin(iriPhase + 2.09) * 0.5 + 0.5,
      sin(iriPhase + 4.18) * 0.5 + 0.5
    ) * pow(rim, 2.2) * 0.055;

    vec3 finalColor = refracted;
    finalColor += vec3(specMask) * (0.12 + rim * 0.22);
    finalColor += vec3(lineSpec) * (0.30 + rim * 0.48);
    finalColor += rimColor + iri;
    finalColor -= vec3(backShadow);

    float alpha = (0.44 + thickness * 0.13 + rim * 0.14) * mask;
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.55), clamp(alpha, 0.0, 0.86));
  }
`;

export const legacyGlassFragmentShader = /* glsl */ `
  uniform sampler2D tBackground;
  uniform sampler2D tNormal;
  uniform sampler2D tEnv;
  uniform vec2 uSize;       // panel size in pixels
  uniform float uRadius;    // border radius in pixels
  uniform float uTime;

  varying vec2 vUv;
  varying vec4 vClipPos;

  // --- helpers ---

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),              hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Signed distance to a rounded rectangle (p in pixel space, centered at 0)
  float rrSDF(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec2 envMapEquirect(vec3 dir) {
    dir = normalize(dir);
    float u = atan(dir.z, dir.x) * 0.15915494309 + 0.5;
    float v = acos(clamp(dir.y, -1.0, 1.0)) * 0.31830988618;
    return vec2(u, v);
  }

  void main() {
    // --- screen UV (for sampling background texture) ---
    vec2 screenUV = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;

    // --- local pixel coords (centered, for SDF) ---
    vec2 localPx  = (vUv - 0.5) * uSize;

    // --- rounded rect mask ---
    float sdf  = rrSDF(localPx, uSize * 0.5, uRadius);
    float mask = 1.0 - smoothstep(-1.0, 1.0, sdf);
    if (mask < 0.01) discard;

    // --- per-panel UV from center, normalised ---
    vec2  delta = vUv - 0.5;
    float dist  = length(delta);
    vec2 normalUv = vUv + vec2(sin(uTime * 0.05), cos(uTime * 0.045)) * 0.01;
    vec3 nMap = texture2D(tNormal, normalUv).rgb * 2.0 - 1.0;
    nMap.xy *= vec2(0.82, 0.68);
    nMap.z = max(nMap.z, 0.12);
    nMap = normalize(nMap);

    // ── REFRACTION ──────────────────────────────────────────────────────
    // Very subtle convex-lens warp: bends slightly outward from center.
    // iOS 26 glass refracts gently — it's not a prism.
    float innerDepth = smoothstep(0.0, 0.72, dist);
    float rimDepth = pow(clamp(1.0 - smoothstep(0.0, 11.0, -sdf), 0.0, 1.0), 1.45);
    float cornerDepth = pow(max(abs(delta.x), abs(delta.y)) * 2.0, 3.0) * 0.34;
    float thickness = clamp(innerDepth * 0.38 + rimDepth * 1.18 + cornerDepth, 0.0, 1.65);
    vec2  lensOffset = normalize(delta + vec2(0.0001)) * thickness * 0.033;

    // Slow liquid breathing animation
    float t  = uTime * 0.08;
    float wx = (noise(vUv * 2.8 + vec2(t,        0.0)) - 0.5);
    float wy = (noise(vUv * 2.8 + vec2(0.0, t * 1.3)) - 0.5);
    vec2  liquidWarp = vec2(wx, wy) * (0.0025 + rimDepth * 0.005);

    vec2 normalWarp = nMap.xy * (0.023 + thickness * 0.034);
    vec2 totalOffset = lensOffset + liquidWarp + normalWarp;

    // ── CHROMATIC ABERRATION ─────────────────────────────────────────────
    // Very slight — just enough to feel like real glass dispersion.
    float disp = 0.0045 + thickness * 0.004 + length(nMap.xy) * 0.003;
    vec2 blurAxis = normalize(totalOffset + nMap.xy * 0.01 + vec2(0.0001));
    float blurRadius = 0.0015 + rimDepth * 0.012 + thickness * 0.0035;
    vec2 caOffset = totalOffset * disp;
    vec3 refracted =
      texture2D(tBackground, screenUV + totalOffset).rgb * 0.38 +
      texture2D(tBackground, screenUV + totalOffset + blurAxis * blurRadius).rgb * 0.17 +
      texture2D(tBackground, screenUV + totalOffset - blurAxis * blurRadius).rgb * 0.17 +
      texture2D(tBackground, screenUV + totalOffset + vec2(-blurAxis.y, blurAxis.x) * blurRadius * 0.72).rgb * 0.14 +
      texture2D(tBackground, screenUV + totalOffset - vec2(-blurAxis.y, blurAxis.x) * blurRadius * 0.72).rgb * 0.14;
    refracted.r = texture2D(tBackground, screenUV + totalOffset + caOffset).r;
    refracted.b = texture2D(tBackground, screenUV + totalOffset - caOffset).b;

    // Tiny lift: glass concentrates ambient light
    refracted = (refracted - 0.5) * 1.04 + 0.5;
    refracted *= 1.07;

    // Cool micro-tint (real glass blue cast)
    refracted *= vec3(0.975, 0.985, 1.02);
    vec3 viewDir = normalize(vec3(delta * 0.9, 1.18));
    vec3 reflDir = reflect(-viewDir, nMap);
    vec3 env = texture2D(tEnv, envMapEquirect(reflDir)).rgb;
    env = pow(max(env, vec3(0.0)), vec3(1.75));
    float envPeak = max(max(env.r, env.g), env.b);
    float envSpec = smoothstep(0.42, 0.82, envPeak);

    // ── SPECULAR HIGHLIGHT ───────────────────────────────────────────────
    // ONE narrow bright line at the TOP edge (vUv.y → 1).
    // Think: light hitting the top rim of a thick glass bar.
    float topEdge = smoothstep(0.88, 0.96, vUv.y)
                  * (1.0 - smoothstep(0.96, 1.00, vUv.y));
    float hMask   = smoothstep(0.0, 0.04, vUv.x)
                  * smoothstep(1.0, 0.96, vUv.x);
    // Vary intensity across the width — real glass isn't perfectly uniform
    float specVary = noise(vec2(vUv.x * 4.5, 0.2) + t * 0.12) * 0.22 + 0.78;
    float topSpec  = topEdge * hMask * specVary * (1.35 + rimDepth * 0.9);
    float ridgeSpec = pow(clamp(abs(nMap.x) + abs(nMap.y), 0.0, 1.0), 4.8) * (0.42 + rimDepth * 0.72);

    // ── BOTTOM EDGE SHADOW ───────────────────────────────────────────────
    // Dark thin line at bottom — the back-face shadow of thick glass.
    float bottomShadow = smoothstep(0.11, 0.0, vUv.y) * (0.20 + rimDepth * 0.12);

    // ── RIM FRESNEL ──────────────────────────────────────────────────────
    // Very subtle edge glow — barely visible, just enough to feel 3D.
    float rimGlow = (1.0 - smoothstep(0.0, 4.0, -sdf)) * 0.30;

    // ── IRIDESCENCE at rim (subtle rainbow micro-refraction) ─────────────
    float iriPhase = dist * 5.2 + t * 0.4;
    vec3 iriColor  = vec3(
      sin(iriPhase + 0.0 ) * 0.5 + 0.5,
      sin(iriPhase + 2.09) * 0.5 + 0.5,
      sin(iriPhase + 4.18) * 0.5 + 0.5
    );
    float iriFresnel = pow(clamp(1.0 - smoothstep(0.0, 5.0, -sdf), 0.0, 1.0), 2.0);
    vec3  iriContrib = iriColor * iriFresnel * 0.06;

    // ── COMPOSITE ────────────────────────────────────────────────────────
    vec3 finalColor = refracted
      + vec3(topSpec)
      + env * envSpec * (0.72 + rimDepth * 0.55)
      + vec3(ridgeSpec)
      + vec3(rimGlow * 0.35)
      - vec3(bottomShadow)
      + iriContrib;

    // Alpha: mostly transparent glass — rim slightly more opaque
    float alpha = (0.62 + rimGlow * 0.24 + rimDepth * 0.08) * mask;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.5), clamp(alpha, 0.0, 1.0));
  }
`;

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { measureHeroLayout, buildHeroComposition, applyHeroCssVars } from "./composition.js";
import { createParticleState, updateParticleState } from "./particles.js";
import { createInteractionController } from "./interaction.js";

const CAMERA_FOV = 40;
const CAMERA_Z = 18;
const SECTION_SELECTORS = [
  { key: "hero", selector: "#hero" },
  { key: "browse", selector: "#browse-directory" },
  { key: "directory", selector: ".landing-directory" },
  { key: "insights", selector: "#community-insights" },
  { key: "footer", selector: ".footer" }
];
const SECTION_POSES = [
  { groupX: 0.79, groupY: 0.06, rotX: -0.16, rotY: -0.5, rotZ: 0.05, scale: 1.13, camX: 0.02, camY: -0.05, camZ: 19.2, lookX: 0.14, lookY: -0.03 },
  { groupX: 0.62, groupY: 0.04, rotX: -0.12, rotY: -0.22, rotZ: 0.028, scale: 1.05, camX: 0.03, camY: -0.01, camZ: 18.75, lookX: 0.11, lookY: 0.01 },
  { groupX: 0.46, groupY: -0.01, rotX: -0.08, rotY: 0.02, rotZ: -0.008, scale: 0.99, camX: 0.035, camY: 0.03, camZ: 18.35, lookX: 0.08, lookY: 0.05 },
  { groupX: 0.54, groupY: -0.08, rotX: -0.05, rotY: 0.16, rotZ: -0.04, scale: 0.98, camX: 0.03, camY: 0.04, camZ: 17.98, lookX: 0.07, lookY: 0.03 },
  { groupX: 0.35, groupY: -0.17, rotX: -0.03, rotY: 0.07, rotZ: -0.02, scale: 0.95, camX: 0.01, camY: -0.06, camZ: 18.45, lookX: 0.02, lookY: -0.06 }
];
const TRIANGLE_SEGMENTS = new Float32Array([
  0, 1, 0,
  -0.866, -0.5, 0,
  -0.866, -0.5, 0,
  0.866, -0.5, 0,
  0.866, -0.5, 0,
  0, 1, 0
]);

const VERTEX_SHADER = [
  "attribute vec3 instanceOffset;",
  "attribute float instanceScale;",
  "attribute float instanceAngle;",
  "attribute float instanceAlpha;",
  "attribute vec3 instanceColor;",
  "attribute float instancePhase;",
  "attribute float instanceSpin;",
  "attribute float instanceShear;",
  "uniform float uTime;",
  "varying vec3 vColor;",
  "varying float vAlpha;",
  "mat2 rotate2d(float angle) {",
  "  float s = sin(angle);",
  "  float c = cos(angle);",
  "  return mat2(c, -s, s, c);",
  "}",
  "void main() {",
  "  vec2 local = position.xy;",
  "  local.x *= instanceShear;",
  "  local = rotate2d(instanceAngle) * (local * instanceScale);",
  "  vec3 transformed = vec3(local, 0.0) + instanceOffset;",
  "  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);",
  "  float depthFade = smoothstep(-48.0, -4.0, mvPosition.z);",
  "  float nearGlow = 1.0 - smoothstep(-12.0, 2.0, mvPosition.z);",
  "  float pulse = 0.92 + sin(uTime * (0.2 + instanceSpin) + instancePhase) * 0.08;",
  "  vColor = instanceColor * mix(0.82, 1.18, depthFade + nearGlow * 0.22) * pulse;",
  "  vAlpha = min(instanceAlpha * (depthFade * 0.8 + nearGlow * 0.36 + 0.16), 1.42);",
  "  gl_Position = projectionMatrix * mvPosition;",
  "}"
].join("\n");

const FRAGMENT_SHADER = [
  "varying vec3 vColor;",
  "varying float vAlpha;",
  "void main() {",
  "  gl_FragColor = vec4(vColor, vAlpha);",
  "}"
].join("\n");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothStep(start, end, value) {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function getMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasSeenEntrance() {
  try {
    return window.sessionStorage.getItem("grc-directory-hero-entrance") === "seen";
  } catch (error) {
    return false;
  }
}

function markEntranceSeen() {
  try {
    window.sessionStorage.setItem("grc-directory-hero-entrance", "seen");
  } catch (error) {
    // Session storage is optional here.
  }
}

function getPageScrollProgress(scrollElement) {
  const scrollTop = window.scrollY || scrollElement.scrollTop || 0;
  const scrollHeight = Math.max(
    scrollElement.scrollHeight || 0,
    document.documentElement.scrollHeight || 0,
    document.body.scrollHeight || 0
  );
  const maxScroll = Math.max(scrollHeight - window.innerHeight, 1);
  return clamp(scrollTop / maxScroll, 0, 1);
}

function buildSectionMetrics(scrollElement) {
  const scrollHeight = Math.max(
    scrollElement.scrollHeight || 0,
    document.documentElement.scrollHeight || 0,
    document.body.scrollHeight || 0
  );
  const maxScroll = Math.max(scrollHeight - window.innerHeight, 1);
  const starts = [];

  for (let index = 0; index < SECTION_SELECTORS.length; index += 1) {
    const element = document.querySelector(SECTION_SELECTORS[index].selector);

    if (!element) {
      starts.push(index === 0 ? 0 : 1);
      continue;
    }

    if (index === 0) {
      starts.push(0);
      continue;
    }

    const rect = element.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const bias = index === SECTION_SELECTORS.length - 1 ? 0.4 : 0.18;
    starts.push(clamp((top - window.innerHeight * bias) / maxScroll, 0, 1));
  }

  return { starts: starts };
}

function buildNarrative(progress, sectionMetrics, config) {
  const starts = sectionMetrics.starts;
  let fromFormation = starts.length - 1;

  for (let index = 0; index < starts.length; index += 1) {
    if (progress >= starts[index]) {
      fromFormation = index;
    } else {
      break;
    }
  }

  const toFormation = Math.min(fromFormation + 1, starts.length - 1);
  if (fromFormation === toFormation) {
    return {
      progress: progress,
      fromFormation: fromFormation,
      toFormation: toFormation,
      localProgress: 1,
      depthPush: 0.22,
      scatterMix: 0,
      chaos: 0,
      dispersion: 0,
      reassembly: 1,
      tension: 0
    };
  }

  const start = starts[fromFormation];
  const end = Math.max(starts[toFormation], start + 0.0001);
  const localProgress = clamp((progress - start) / (end - start), 0, 1);
  const reassemblyWindow = clamp(config.reassemblyWindow || 0.56, 0.32, 0.78);
  const reassemblyStart = clamp(0.84 - reassemblyWindow, 0.24, 0.7);
  const reassemblyEnd = clamp(reassemblyStart + reassemblyWindow, reassemblyStart + 0.12, 0.96);
  const depthPunch = smoothStep(0.06, 0.24, localProgress);
  const scatterMix = smoothStep(0.18, 0.5, localProgress) * (1 - smoothStep(0.7, 0.9, localProgress) * 0.34);
  const chaosPlateau = smoothStep(0.3, 0.56, localProgress) * (1 - smoothStep(0.62, 0.88, localProgress));
  const reassembly = smoothStep(reassemblyStart, reassemblyEnd, localProgress);
  const chaos = clamp(Math.max(scatterMix * (1 - reassembly) * 0.68, chaosPlateau * 0.55), 0, 1);
  const dispersion = clamp(
    smoothStep(0.16, 0.46, localProgress) * (1 - reassembly * 0.28)
      + chaosPlateau * 0.18,
    0,
    1
  );
  const depthPush = clamp(depthPunch * (1 - reassembly * 0.2) + chaosPlateau * 0.1, 0, 1);
  const tension = clamp(smoothStep(0.14, 0.34, localProgress) - reassembly * 0.36, 0, 1);

  return {
    progress: progress,
    fromFormation: fromFormation,
    toFormation: toFormation,
    localProgress: localProgress,
    depthPush: depthPush,
    scatterMix: scatterMix,
    chaos: chaos,
    dispersion: dispersion,
    reassembly: reassembly,
    tension: tension
  };
}

function smoothProgress(current, target, deltaTime, config) {
  const easing = 1 - Math.exp(-(config.scrollSmoothing || 3.6) * deltaTime);
  const maxStep = Math.max((config.scrollVelocityClamp || 0.24) * deltaTime, 0.001);
  const delta = clamp(target - current, -maxStep, maxStep);
  const lerpFactor = 0.18 + easing * 0.52;

  return current + delta * lerpFactor;
}

export function createHeroRenderer(options) {
  const root = options.root;
  const canvas = options.canvas;
  const viewportElement = options.viewportElement;
  const scrollElement = options.scrollElement || document.documentElement;
  let config = options.config;
  let reducedMotion = getMotionPreference();
  let scene = null;
  let camera = null;
  let renderer = null;
  let group = null;
  let lineSegments = null;
  let material = null;
  let geometry = null;
  let offsetAttribute = null;
  let scaleAttribute = null;
  let alphaAttribute = null;
  let angleAttribute = null;
  let interaction = null;
  let resizeTimer = null;
  let frameId = 0;
  let elapsed = 0;
  let lastTime = 0;
  let entranceActive = config.entranceEnabled && !reducedMotion && !hasSeenEntrance();
  let entranceStartedAt = 0;
  let state = null;
  let composition = null;
  let sectionMetrics = buildSectionMetrics(scrollElement);
  let rawScrollProgress = 0;
  let displayedScrollProgress = 0;
  let groupPositionX = 0.16;
  let groupPositionY = 0.04;
  let groupRotationX = -0.14;
  let groupRotationY = -0.3;
  let groupRotationZ = 0.08;
  let groupScale = 1.08;
  let cameraOffsetX = 0;
  let cameraOffsetY = 0;
  let cameraOffsetZ = CAMERA_Z;
  let lookAtX = 0;
  let lookAtY = 0;
  let heroPointerEnabled = true;

  function createMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }

  function createGeometry(nextState) {
    const nextGeometry = new THREE.InstancedBufferGeometry();

    nextGeometry.setAttribute("position", new THREE.BufferAttribute(TRIANGLE_SEGMENTS, 3));
    offsetAttribute = new THREE.InstancedBufferAttribute(nextState.current, 3);
    offsetAttribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("instanceOffset", offsetAttribute);

    scaleAttribute = new THREE.InstancedBufferAttribute(nextState.scales, 1);
    scaleAttribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("instanceScale", scaleAttribute);

    angleAttribute = new THREE.InstancedBufferAttribute(nextState.angles, 1);
    angleAttribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("instanceAngle", angleAttribute);

    alphaAttribute = new THREE.InstancedBufferAttribute(nextState.alpha, 1);
    alphaAttribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("instanceAlpha", alphaAttribute);

    nextGeometry.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(nextState.colors, 3));
    nextGeometry.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(nextState.phases, 1));
    nextGeometry.setAttribute("instanceSpin", new THREE.InstancedBufferAttribute(nextState.spins, 1));
    nextGeometry.setAttribute("instanceShear", new THREE.InstancedBufferAttribute(nextState.shears, 1));
    nextGeometry.instanceCount = nextState.count;

    return nextGeometry;
  }

  function disposeGeometry() {
    if (geometry) geometry.dispose();
    geometry = null;
    offsetAttribute = null;
    scaleAttribute = null;
    alphaAttribute = null;
    angleAttribute = null;

    if (lineSegments && group) {
      group.remove(lineSegments);
      lineSegments = null;
    }
  }

  function applyRendererSize() {
    const width = viewportElement.clientWidth || window.innerWidth;
    const height = viewportElement.clientHeight || window.innerHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.dprClamp));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function rebuildComposition() {
    const layout = measureHeroLayout(root, viewportElement);

    composition = buildHeroComposition({
      layout: layout,
      particleCount: config.particleCount,
      ambientCount: config.ambientCount,
      foregroundCount: config.foregroundCount,
      palette: config.colorPalette,
      shapeScale: config.shapeScale,
      shapeMode: config.shapeMode,
      scatterDistance: config.scatterDistance,
      colorIntensity: config.colorIntensity
    });
    applyHeroCssVars(root, composition, layout);

    state = createParticleState(
      composition.samples,
      config.colorPalette,
      camera,
      layout.viewportWidth < 640,
      entranceActive && !reducedMotion
    );

    disposeGeometry();
    geometry = createGeometry(state);
    lineSegments = new THREE.LineSegments(geometry, material);
    lineSegments.frustumCulled = false;
    group.add(lineSegments);
    if (interaction) interaction.refreshBounds();
  }

  function setFallbackState() {
    root.classList.add("hero-animation-fallback");
    canvas.style.display = "none";
  }

  function syncInteractionState(narrative) {
    if (!interaction) return;

    const rect = root.getBoundingClientRect();
    const isVisible = rect.bottom > window.innerHeight * 0.18
      && rect.top < window.innerHeight * 0.78
      && narrative.fromFormation === 0;

    if (heroPointerEnabled !== isVisible) {
      heroPointerEnabled = isVisible;
      interaction.setEnabled(isVisible);
    }
  }

  function updateSceneMotion(interactionState, narrative, deltaTime) {
    const pointerX = (interactionState.x - 0.5) * interactionState.active * interactionState.strength;
    const pointerY = (0.5 - interactionState.y) * interactionState.active * interactionState.strength;
    const pointerRotationStrength = config.pointerRotationStrength || 0.08;
    const motionEasing = 1 - Math.exp(-(config.motionEasing || 1.7) * deltaTime);
    const cameraEasing = 1 - Math.exp(-(config.cameraEasing || 0.8) * deltaTime);
    const cameraDriftStrength = config.cameraDriftStrength || 0.12;
    const fromPose = SECTION_POSES[narrative.fromFormation] || SECTION_POSES[0];
    const toPose = SECTION_POSES[narrative.toFormation] || fromPose;
    const poseMix = narrative.reassembly;
    const poseGroupX = lerp(fromPose.groupX, toPose.groupX, poseMix);
    const poseGroupY = lerp(fromPose.groupY, toPose.groupY, poseMix);
    const poseRotX = lerp(fromPose.rotX, toPose.rotX, poseMix);
    const poseRotY = lerp(fromPose.rotY, toPose.rotY, poseMix);
    const poseRotZ = lerp(fromPose.rotZ, toPose.rotZ, poseMix);
    const poseScale = lerp(fromPose.scale, toPose.scale, poseMix);
    const poseCamX = lerp(fromPose.camX, toPose.camX, poseMix);
    const poseCamY = lerp(fromPose.camY, toPose.camY, poseMix);
    const poseCamZ = lerp(fromPose.camZ, toPose.camZ, poseMix);
    const poseLookX = lerp(fromPose.lookX, toPose.lookX, poseMix);
    const poseLookY = lerp(fromPose.lookY, toPose.lookY, poseMix);
    const idleDriftX = Math.sin(elapsed * 0.08) * 0.022 * config.idleDriftStrength;
    const idleDriftY = Math.cos(elapsed * 0.07 + 0.8) * 0.018 * config.idleDriftStrength;
    const idleRotX = Math.sin(elapsed * 0.06 + 0.3) * 0.013 * config.idleRotationStrength;
    const idleRotY = Math.cos(elapsed * 0.055 + 1.1) * 0.028 * config.idleRotationStrength;
    const idleRotZ = Math.sin(elapsed * 0.05 + 2.4) * 0.014 * config.idleRotationStrength;
    const pointerRotY = pointerX * 0.018 * pointerRotationStrength;
    const pointerRotX = pointerY * 0.008 * pointerRotationStrength;
    const targetGroupX = poseGroupX
      - narrative.depthPush * 0.26
      + idleDriftX;
    const targetGroupY = poseGroupY
      - narrative.depthPush * 0.08
      + idleDriftY
      + narrative.chaos * 0.02;
    const targetRotationY = poseRotY
      + pointerRotY
      + idleRotY
      + narrative.depthPush * 0.12
      + narrative.chaos * 0.08;
    const targetRotationX = poseRotX
      + pointerRotX
      + idleRotX
      - narrative.depthPush * 0.05
      + narrative.chaos * 0.02;
    const targetRotationZ = poseRotZ
      + idleRotZ
      + narrative.scatterMix * 0.05
      + narrative.chaos * 0.04;
    const targetScale = poseScale
      + narrative.depthPush * 0.12
      + narrative.chaos * 0.04;
    const targetCameraX = poseCamX
      - narrative.depthPush * 0.1
      + Math.sin(elapsed * 0.01 + 1.2) * (0.008 * cameraDriftStrength);
    const targetCameraY = poseCamY
      + narrative.depthPush * 0.06
      - narrative.reassembly * 0.02
      + Math.cos(elapsed * 0.008 + 0.3) * (0.006 * cameraDriftStrength);
    const targetCameraZ = poseCamZ
      - narrative.depthPush * 1.8
      - narrative.chaos * 0.36
      - narrative.dispersion * 0.22;
    const targetLookAtX = poseLookX - narrative.depthPush * 0.1;
    const targetLookAtY = poseLookY + narrative.chaos * 0.005;

    groupPositionX += (targetGroupX - groupPositionX) * motionEasing;
    groupPositionY += (targetGroupY - groupPositionY) * motionEasing;
    groupRotationX += (targetRotationX - groupRotationX) * motionEasing;
    groupRotationY += (targetRotationY - groupRotationY) * motionEasing;
    groupRotationZ += (targetRotationZ - groupRotationZ) * motionEasing;
    groupScale += (targetScale - groupScale) * motionEasing;
    cameraOffsetX += (targetCameraX - cameraOffsetX) * cameraEasing;
    cameraOffsetY += (targetCameraY - cameraOffsetY) * cameraEasing;
    cameraOffsetZ += (targetCameraZ - cameraOffsetZ) * cameraEasing;
    lookAtX += (targetLookAtX - lookAtX) * cameraEasing;
    lookAtY += (targetLookAtY - lookAtY) * cameraEasing;

    group.position.x = groupPositionX;
    group.position.y = groupPositionY;
    group.rotation.x = groupRotationX;
    group.rotation.y = groupRotationY;
    group.rotation.z = groupRotationZ;
    group.scale.setScalar(groupScale);

    camera.position.x = cameraOffsetX;
    camera.position.y = cameraOffsetY;
    camera.position.z = cameraOffsetZ;
    camera.lookAt(lookAtX, lookAtY, 0);
  }

  function renderFrame(timestamp) {
    frameId = window.requestAnimationFrame(renderFrame);
    const deltaTime = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.034) : 1 / 60;

    lastTime = timestamp;
    elapsed += deltaTime;
    if (interaction) interaction.tick(deltaTime);

    const entranceProgress = entranceActive
      ? Math.min((timestamp - entranceStartedAt) / config.entranceDurationMs, 1)
      : 1;
    const interactionState = interaction
      ? interaction.getState()
      : { x: 0.5, y: 0.5, active: 0, strength: 0 };
    rawScrollProgress = typeof config.chapterProgress === "number"
      ? clamp(config.chapterProgress, 0, 1)
      : getPageScrollProgress(scrollElement);
    displayedScrollProgress = smoothProgress(displayedScrollProgress, rawScrollProgress, deltaTime, config);
    const narrative = buildNarrative(displayedScrollProgress, sectionMetrics, config);

    syncInteractionState(narrative);

    updateParticleState(
      state,
      { deltaTime: deltaTime, elapsed: elapsed },
      interactionState,
      config,
      entranceProgress,
      narrative
    );

    if (offsetAttribute) offsetAttribute.needsUpdate = true;
    if (scaleAttribute) scaleAttribute.needsUpdate = true;
    if (alphaAttribute) alphaAttribute.needsUpdate = true;
    if (angleAttribute) angleAttribute.needsUpdate = true;
    material.uniforms.uTime.value = elapsed;
    updateSceneMotion(interactionState, narrative, deltaTime);
    renderer.render(scene, camera);

    if (entranceActive && entranceProgress >= 1) {
      entranceActive = false;
    }
  }

  function renderStaticFrame() {
    const progress = typeof config.chapterProgress === "number"
      ? clamp(config.chapterProgress, 0, 1)
      : 0;
    rawScrollProgress = progress;
    displayedScrollProgress = progress;
    const narrative = buildNarrative(progress, sectionMetrics, config);

    updateParticleState(
      state,
      { deltaTime: 1 / 60, elapsed: 1.2 },
      { x: 0.5, y: 0.5, active: 0, strength: 0 },
      config,
      1,
      narrative
    );

    if (offsetAttribute) offsetAttribute.needsUpdate = true;
    if (scaleAttribute) scaleAttribute.needsUpdate = true;
    if (alphaAttribute) alphaAttribute.needsUpdate = true;
    if (angleAttribute) angleAttribute.needsUpdate = true;
    material.uniforms.uTime.value = 1.2;
    updateSceneMotion({ x: 0.5, y: 0.5, active: 0, strength: 0 }, narrative, 1 / 60);
    renderer.render(scene, camera);
  }

  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      applyRendererSize();
      sectionMetrics = buildSectionMetrics(scrollElement);
      rebuildComposition();
      if (reducedMotion) {
        renderStaticFrame();
      }
    }, 120);
  }

  function buildScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 64);
    camera.position.set(0, 0, CAMERA_Z);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: config.qualityMode !== "low",
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    material = createMaterial();
    group = new THREE.Group();
    scene.add(group);

    applyRendererSize();
    sectionMetrics = buildSectionMetrics(scrollElement);
    rawScrollProgress = typeof config.chapterProgress === "number"
      ? clamp(config.chapterProgress, 0, 1)
      : getPageScrollProgress(scrollElement);
    displayedScrollProgress = rawScrollProgress;
    rebuildComposition();

    root.classList.remove("hero-animation-fallback");
    canvas.style.display = "";

    if (!reducedMotion) {
      interaction = createInteractionController(root, viewportElement, config.interactionStrength);
    }

    window.addEventListener("resize", handleResize);
  }

  function start() {
    try {
      buildScene();
    } catch (error) {
      setFallbackState();
      return;
    }

    if (entranceActive) {
      entranceStartedAt = performance.now();
      markEntranceSeen();
    }

    if (reducedMotion) {
      renderStaticFrame();
    } else {
      frameId = window.requestAnimationFrame(renderFrame);
    }
  }

  return {
    start: start,
    destroy() {
      clearTimeout(resizeTimer);
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (interaction) interaction.destroy();
      interaction = null;
      disposeGeometry();
      if (material) material.dispose();
      if (renderer) renderer.dispose();
      scene = null;
      camera = null;
      renderer = null;
      material = null;
      group = null;
      state = null;
      composition = null;
      frameId = 0;
    },
    refreshLayout() {
      if (!renderer) return;
      applyRendererSize();
      rebuildComposition();
      if (reducedMotion) renderStaticFrame();
    },
    updateConfig(nextConfig) {
      config = nextConfig;
      reducedMotion = getMotionPreference();
      if (interaction) interaction.setStrength(config.interactionStrength);
      entranceActive = false;
      this.refreshLayout();
    },
    updateTheme(nextTheme, nextConfig) {
      config = nextConfig;
      if (!renderer) return;
      rebuildComposition();
      if (reducedMotion) renderStaticFrame();
    }
  };
}

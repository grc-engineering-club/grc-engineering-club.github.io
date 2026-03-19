import { clamp, hexToRgb } from "../config.js";

var FORMATION_ORDER = ["hero", "browse", "directory", "insights", "footer"];
var FORMATION_COUNT = FORMATION_ORDER.length;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothOut(t) {
  var value = clamp(t, 0, 1);
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function worldFromUv(u, v, z, camera) {
  var distance = camera.position.z - z;
  var halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance;
  var halfWidth = halfHeight * camera.aspect;

  return {
    x: (u - 0.5) * halfWidth * 2,
    y: (0.5 - v) * halfHeight * 2
  };
}

function buildEntranceOffset(sample, isMobile) {
  var edgeBias = Math.random();
  var startU = sample.scatter.u;
  var startV = sample.scatter.v;
  var startZ = sample.scatter.z + randomBetween(-10, 10);
  var hero = sample.formations.hero;

  if (edgeBias < 0.34) {
    startU = sample.scatter.u + randomBetween(isMobile ? -0.26 : -0.42, isMobile ? 0.26 : 0.42);
    startV = sample.scatter.v - randomBetween(0.16, 0.32);
  } else if (edgeBias < 0.68) {
    startU = sample.scatter.u + (hero.u < 0.5 ? -randomBetween(0.16, 0.42) : randomBetween(0.16, 0.42));
    startV = sample.scatter.v + randomBetween(-0.22, 0.26);
  } else {
    startU = sample.scatter.u + randomBetween(-0.28, 0.28);
    startV = sample.scatter.v + randomBetween(0.14, 0.38);
  }

  return {
    u: startU,
    v: startV,
    z: startZ
  };
}

export function createParticleState(samples, palette, camera, isMobile, useEntrance) {
  var count = samples.length;
  var state = {
    count: count,
    current: new Float32Array(count * 3),
    velocity: new Float32Array(count * 3),
    formations: new Float32Array(count * FORMATION_COUNT * 3),
    scatter: new Float32Array(count * 3),
    entrance: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    scalesBase: new Float32Array(count),
    scales: new Float32Array(count),
    alphaBase: new Float32Array(count),
    alpha: new Float32Array(count),
    angleBase: new Float32Array(count),
    angles: new Float32Array(count),
    phases: new Float32Array(count),
    spins: new Float32Array(count),
    shears: new Float32Array(count),
    flow: new Float32Array(count),
    noise: new Float32Array(count),
    returnStrength: new Float32Array(count),
    interactionWeight: new Float32Array(count),
    depthFactor: new Float32Array(count),
    orderWeight: new Float32Array(count),
    rogueWeight: new Float32Array(count),
    foregroundWeight: new Float32Array(count),
    ambientWeight: new Float32Array(count),
    formationOrbit: new Float32Array(count * FORMATION_COUNT * 2),
    drift: new Float32Array(count * 2),
    formationUv: new Float32Array(count * FORMATION_COUNT * 2),
    scatterUv: new Float32Array(count * 2)
  };

  for (var index = 0; index < count; index += 1) {
    var sample = samples[index];
    var entrance = buildEntranceOffset(sample, isMobile);
    var entranceWorld = worldFromUv(entrance.u, entrance.v, entrance.z, camera);
    var scatterWorld = worldFromUv(sample.scatter.u, sample.scatter.v, sample.scatter.z, camera);
    var color = hexToRgb(palette[sample.colorIndex].hex);
    var offsetIndex = index * 3;
    var formOffset3Base = index * FORMATION_COUNT * 3;
    var formOffset2Base = index * FORMATION_COUNT * 2;
    var driftIndex = index * 2;
    var heroWorld = null;
    var heroZ = 0;

    for (var formationIndex = 0; formationIndex < FORMATION_COUNT; formationIndex += 1) {
      var key = FORMATION_ORDER[formationIndex];
      var formation = sample.formations[key];
      var world = worldFromUv(formation.u, formation.v, formation.z, camera);
      var formOffset3 = formOffset3Base + formationIndex * 3;
      var formOffset2 = formOffset2Base + formationIndex * 2;

      state.formations[formOffset3] = world.x;
      state.formations[formOffset3 + 1] = world.y;
      state.formations[formOffset3 + 2] = formation.z;
      state.formationOrbit[formOffset2] = formation.orbitX;
      state.formationOrbit[formOffset2 + 1] = formation.orbitY;
      state.formationUv[formOffset2] = formation.u;
      state.formationUv[formOffset2 + 1] = formation.v;

      if (formationIndex === 0) {
        heroWorld = world;
        heroZ = formation.z;
      }
    }

    state.scatter[offsetIndex] = scatterWorld.x;
    state.scatter[offsetIndex + 1] = scatterWorld.y;
    state.scatter[offsetIndex + 2] = sample.scatter.z;
    state.scatterUv[driftIndex] = sample.scatter.u;
    state.scatterUv[driftIndex + 1] = sample.scatter.v;
    state.entrance[offsetIndex] = entranceWorld.x;
    state.entrance[offsetIndex + 1] = entranceWorld.y;
    state.entrance[offsetIndex + 2] = entrance.z;

    state.current[offsetIndex] = useEntrance ? entranceWorld.x : heroWorld.x;
    state.current[offsetIndex + 1] = useEntrance ? entranceWorld.y : heroWorld.y;
    state.current[offsetIndex + 2] = useEntrance ? entrance.z : heroZ;

    state.colors[offsetIndex] = color.r;
    state.colors[offsetIndex + 1] = color.g;
    state.colors[offsetIndex + 2] = color.b;

    state.scalesBase[index] = sample.scale;
    state.scales[index] = useEntrance ? sample.scale * 0.06 : sample.scale;
    state.alphaBase[index] = sample.alpha;
    state.alpha[index] = useEntrance ? sample.alpha * 0.02 : sample.alpha;
    state.angleBase[index] = Math.random() * Math.PI * 2;
    state.angles[index] = state.angleBase[index];
    state.phases[index] = sample.phase;
    state.spins[index] = sample.spin;
    state.shears[index] = sample.shear;
    state.flow[index] = sample.flow;
    state.noise[index] = sample.noise;
    state.returnStrength[index] = sample.returnStrength;
    state.interactionWeight[index] = sample.interactionWeight;
    state.depthFactor[index] = sample.depthFactor;
    state.orderWeight[index] = sample.orderWeight;
    state.rogueWeight[index] = sample.rogueWeight;
    state.foregroundWeight[index] = sample.foregroundWeight;
    state.ambientWeight[index] = sample.ambientWeight;
    state.drift[driftIndex] = randomBetween(-1, 1);
    state.drift[driftIndex + 1] = randomBetween(-1, 1);
  }

  return state;
}

export function updateParticleState(state, frame, interaction, config, entranceProgress, narrative) {
  var deltaTime = frame.deltaTime;
  var elapsed = frame.elapsed;
  var morphPhase = narrative.morphPhase;
  var morphProgress = narrative.morphProgress;
  var fromFormation = narrative.fromFormation;
  var toFormation = narrative.toFormation;
  var spring = config.morphSpring || 2.2;
  var damping = config.morphDamping || 0.92;
  var wobbleAmp = config.settledWobble || 0.03;
  var entranceMix = smoothOut(entranceProgress);
  var formationStride3 = FORMATION_COUNT * 3;
  var isTransitioning = morphPhase !== "settled" && fromFormation !== toFormation;
  var easedProgress = isTransitioning ? easeInOutCubic(morphProgress) : 0;

  for (var index = 0; index < state.count; index += 1) {
    var offsetIndex = index * 3;
    var formOffset3Base = index * formationStride3;
    var fromOffset3 = formOffset3Base + fromFormation * 3;
    var toOffset3 = formOffset3Base + toFormation * 3;
    var driftIndex = index * 2;
    var phase = state.phases[index];
    var flow = state.flow[index];
    var targetX = 0;
    var targetY = 0;
    var targetZ = 0;

    if (morphPhase === "settled" || fromFormation === toFormation) {
      var wX = Math.sin(elapsed * (0.06 + flow * 0.2) + phase) * wobbleAmp;
      var wY = Math.cos(elapsed * (0.05 + flow * 0.15) + phase * 1.3) * wobbleAmp * 0.8;
      var wZ = Math.sin(elapsed * (0.04 + flow * 0.1) + phase * 0.7) * wobbleAmp * 0.5;
      targetX = state.formations[fromOffset3] + wX;
      targetY = state.formations[fromOffset3 + 1] + wY;
      targetZ = state.formations[fromOffset3 + 2] + wZ;
    } else if (morphPhase === "departing") {
      targetX = mix(state.formations[fromOffset3], state.scatter[offsetIndex], easedProgress);
      targetY = mix(state.formations[fromOffset3 + 1], state.scatter[offsetIndex + 1], easedProgress);
      targetZ = mix(state.formations[fromOffset3 + 2], state.scatter[offsetIndex + 2], easedProgress);
    } else if (morphPhase === "drifting") {
      var driftMotionX = state.drift[driftIndex] * Math.sin(elapsed * (0.08 + flow * 0.2) + phase) * 0.04;
      var driftMotionY = state.drift[driftIndex + 1] * Math.cos(elapsed * (0.06 + flow * 0.15) + phase) * 0.03;
      targetX = state.scatter[offsetIndex] + driftMotionX;
      targetY = state.scatter[offsetIndex + 1] + driftMotionY;
      targetZ = state.scatter[offsetIndex + 2] + Math.sin(elapsed * 0.04 + phase) * 0.15;
    } else {
      targetX = mix(state.scatter[offsetIndex], state.formations[toOffset3], easedProgress);
      targetY = mix(state.scatter[offsetIndex + 1], state.formations[toOffset3 + 1], easedProgress);
      targetZ = mix(state.scatter[offsetIndex + 2], state.formations[toOffset3 + 2], easedProgress);
    }

    if (entranceMix < 1) {
      targetX = mix(state.entrance[offsetIndex], targetX, entranceMix);
      targetY = mix(state.entrance[offsetIndex + 1], targetY, entranceMix);
      targetZ = mix(state.entrance[offsetIndex + 2], targetZ, entranceMix);
    }

    state.velocity[offsetIndex] += (targetX - state.current[offsetIndex]) * deltaTime * spring;
    state.velocity[offsetIndex + 1] += (targetY - state.current[offsetIndex + 1]) * deltaTime * spring;
    state.velocity[offsetIndex + 2] += (targetZ - state.current[offsetIndex + 2]) * deltaTime * spring * 0.78;
    state.velocity[offsetIndex] *= damping;
    state.velocity[offsetIndex + 1] *= damping;
    state.velocity[offsetIndex + 2] *= damping;
    state.current[offsetIndex] += state.velocity[offsetIndex];
    state.current[offsetIndex + 1] += state.velocity[offsetIndex + 1];
    state.current[offsetIndex + 2] += state.velocity[offsetIndex + 2];

    var transitionBoost = isTransitioning ? 1.04 : 1;
    var appearanceMix = entranceMix < 1 ? mix(0.08, 1, entranceMix) : 1;
    var spinRate = state.spins[index] * (config.rotateSpeed || 0.35) * (isTransitioning ? 1.2 : 0.8);

    state.scales[index] = state.scalesBase[index] * transitionBoost * appearanceMix;
    state.alpha[index] = clamp(state.alphaBase[index] * (config.colorIntensity || 1) * appearanceMix, 0.02, 1.28);
    state.angles[index] = state.angleBase[index]
      + elapsed * spinRate
      + Math.sin(elapsed * (0.22 + flow * 0.24) + phase) * 0.06;
  }
}

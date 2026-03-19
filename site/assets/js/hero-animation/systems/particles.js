import { clamp, hexToRgb } from "../config.js";

const FORMATION_ORDER = ["hero", "browse", "directory", "insights", "footer"];
const FORMATION_COUNT = FORMATION_ORDER.length;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothOut(t) {
  const value = clamp(t, 0, 1);
  return 1 - Math.pow(1 - value, 3);
}

function worldFromUv(u, v, z, camera) {
  const distance = camera.position.z - z;
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance;
  const halfWidth = halfHeight * camera.aspect;

  return {
    x: (u - 0.5) * halfWidth * 2,
    y: (0.5 - v) * halfHeight * 2
  };
}

function buildEntranceOffset(sample, isMobile) {
  const edgeBias = Math.random();
  let startU = sample.scatter.u;
  let startV = sample.scatter.v;
  let startZ = sample.scatter.z + randomBetween(-10, 10);
  const hero = sample.formations.hero;

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
  const count = samples.length;
  const state = {
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

  for (let index = 0; index < count; index += 1) {
    const sample = samples[index];
    const entrance = buildEntranceOffset(sample, isMobile);
    const entranceWorld = worldFromUv(entrance.u, entrance.v, entrance.z, camera);
    const scatterWorld = worldFromUv(sample.scatter.u, sample.scatter.v, sample.scatter.z, camera);
    const color = hexToRgb(palette[sample.colorIndex].hex);
    const offsetIndex = index * 3;
    const formOffset3Base = index * FORMATION_COUNT * 3;
    const formOffset2Base = index * FORMATION_COUNT * 2;
    const driftIndex = index * 2;
    let heroWorld = null;
    let heroZ = 0;

    for (let formationIndex = 0; formationIndex < FORMATION_COUNT; formationIndex += 1) {
      const key = FORMATION_ORDER[formationIndex];
      const formation = sample.formations[key];
      const world = worldFromUv(formation.u, formation.v, formation.z, camera);
      const formOffset3 = formOffset3Base + formationIndex * 3;
      const formOffset2 = formOffset2Base + formationIndex * 2;

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
  const deltaTime = frame.deltaTime;
  const elapsed = frame.elapsed;
  const scatterMix = narrative.scatterMix;
  const depthPush = narrative.depthPush;
  const chaos = narrative.chaos;
  const dispersion = narrative.dispersion;
  const reassembly = narrative.reassembly;
  const fromFormation = narrative.fromFormation;
  const toFormation = narrative.toFormation;
  const tension = narrative.tension || 0;
  const damping = 1 - clamp(deltaTime * (2.6 + chaos * 0.45 + dispersion * 0.68 + reassembly * 0.52), 0.035, 0.1);
  const entranceMix = smoothOut(entranceProgress);
  const formationStride3 = FORMATION_COUNT * 3;
  const formationStride2 = FORMATION_COUNT * 2;

  for (let index = 0; index < state.count; index += 1) {
    const offsetIndex = index * 3;
    const formationOffset3Base = index * formationStride3;
    const formationOffset2Base = index * formationStride2;
    const fromOffset3 = formationOffset3Base + fromFormation * 3;
    const toOffset3 = formationOffset3Base + toFormation * 3;
    const fromOffset2 = formationOffset2Base + fromFormation * 2;
    const toOffset2 = formationOffset2Base + toFormation * 2;
    const driftIndex = index * 2;
    const phase = state.phases[index];
    const flow = state.flow[index] * config.driftSpeed;
    const noise = state.noise[index];
    const foregroundWeight = state.foregroundWeight[index];
    const ambientWeight = state.ambientWeight[index];
    const rogueWeight = state.rogueWeight[index];
    const depthFactor = state.depthFactor[index];
    const orderWeight = state.orderWeight[index];
    const timeA = elapsed * (0.08 + flow * 0.44) + phase;
    const timeB = elapsed * (0.06 + noise * 0.42) + phase * 1.17;
    const fromWave = Math.sin(timeA);
    const toWave = Math.sin(elapsed * (0.1 + flow * 0.36) + phase * 0.62);
    const scatterWave = Math.cos(elapsed * (0.12 + flow * 0.32) + phase * 0.74);
    const fromMotionX = state.formationOrbit[fromOffset2] * fromWave * (0.045 + flow * 0.1) * (0.3 + depthFactor * 0.28);
    const fromMotionY = state.formationOrbit[fromOffset2 + 1] * fromWave * (0.04 + flow * 0.08) * (0.28 + depthFactor * 0.22);
    const toMotionX = state.formationOrbit[toOffset2] * toWave * (0.04 + orderWeight * 0.04) * (0.22 + reassembly * 0.24);
    const toMotionY = state.formationOrbit[toOffset2 + 1] * toWave * (0.038 + orderWeight * 0.04) * (0.2 + reassembly * 0.22);
    const chaosAmplitude = (0.045 + rogueWeight * 0.08 + foregroundWeight * 0.08) * (0.28 + chaos * 0.42 + dispersion * 0.22 + tension * 0.08);
    const scatterMotionX = state.drift[driftIndex] * scatterWave * chaosAmplitude;
    const scatterMotionY = state.drift[driftIndex + 1] * Math.sin(elapsed * (0.1 + noise * 0.32) + phase) * chaosAmplitude * 0.68;

    let targetX = mix(
      state.formations[fromOffset3] + fromMotionX,
      state.scatter[offsetIndex] + scatterMotionX,
      scatterMix
    );
    let targetY = mix(
      state.formations[fromOffset3 + 1] + fromMotionY,
      state.scatter[offsetIndex + 1] + scatterMotionY,
      scatterMix
    );
    let targetZ = mix(
      state.formations[fromOffset3 + 2] + Math.cos(timeB) * (0.12 + depthFactor * 0.2),
      state.scatter[offsetIndex + 2] + Math.sin(timeA) * (0.2 + rogueWeight * 0.42 + foregroundWeight * 0.34) * (0.12 + chaos * 0.28),
      scatterMix
    );

    targetX = mix(targetX, state.formations[toOffset3] + toMotionX, reassembly);
    targetY = mix(targetY, state.formations[toOffset3 + 1] + toMotionY, reassembly);
    targetZ = mix(
      targetZ,
      state.formations[toOffset3 + 2] + Math.cos(timeA * 0.92) * (0.14 + orderWeight * 0.18),
      reassembly
    );

    if (entranceMix < 1) {
      targetX = mix(state.entrance[offsetIndex], targetX, entranceMix);
      targetY = mix(state.entrance[offsetIndex + 1], targetY, entranceMix);
      targetZ = mix(state.entrance[offsetIndex + 2], targetZ, entranceMix);
    }

    const spring = state.returnStrength[index] * (0.44 + depthPush * 0.16 + dispersion * 0.14 + chaos * 0.12 + reassembly * 0.12);

    state.velocity[offsetIndex] += (targetX - state.current[offsetIndex]) * deltaTime * spring;
    state.velocity[offsetIndex + 1] += (targetY - state.current[offsetIndex + 1]) * deltaTime * spring;
    state.velocity[offsetIndex + 2] += (targetZ - state.current[offsetIndex + 2]) * deltaTime * spring * 0.78;
    state.velocity[offsetIndex] *= damping;
    state.velocity[offsetIndex + 1] *= damping;
    state.velocity[offsetIndex + 2] *= damping;
    state.current[offsetIndex] += state.velocity[offsetIndex];
    state.current[offsetIndex + 1] += state.velocity[offsetIndex + 1];
    state.current[offsetIndex + 2] += state.velocity[offsetIndex + 2];

    const scaleBoost = 1
      + depthPush * (0.08 + depthFactor * 0.06)
      + dispersion * (depthFactor * 0.06 + foregroundWeight * 0.12)
      + chaos * (ambientWeight * 0.03 + foregroundWeight * 0.08 + rogueWeight * 0.02)
      + reassembly * orderWeight * 0.06;
    const alphaBoost = clamp(
      (0.94 + depthPush * 0.08 + dispersion * 0.18 + chaos * 0.06 + reassembly * 0.08) * config.colorIntensity,
      0.4,
      1.6
    );
    const appearanceMix = entranceMix < 1 ? mix(0.08, 1, entranceMix) : 1;
    const spinRate = state.spins[index] * config.rotateSpeed * (0.44 + dispersion * 0.48 + chaos * 0.2 + reassembly * 0.16);

    state.scales[index] = state.scalesBase[index] * scaleBoost * appearanceMix;
    state.alpha[index] = clamp(state.alphaBase[index] * alphaBoost * appearanceMix, 0.02, 1.28);
    state.angles[index] = state.angleBase[index]
      + elapsed * spinRate
      + Math.sin(elapsed * (0.22 + flow * 0.24) + phase) * (0.06 + rogueWeight * 0.06);
  }
}

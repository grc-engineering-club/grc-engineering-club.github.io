import { clamp } from "../config.js";

const COLOR_PROFILES = {
  bright: [0.38, 0.34, 0.14, 0.04, 0.04, 0.06],
  warm: [0.18, 0.44, 0.22, 0.04, 0.03, 0.09],
  mixed: [0.16, 0.28, 0.16, 0.12, 0.1, 0.18],
  cool: [0.1, 0.18, 0.12, 0.2, 0.16, 0.24]
};

function rectToViewportSpace(rect, viewportRect) {
  const left = (rect.left - viewportRect.left) / viewportRect.width;
  const top = (rect.top - viewportRect.top) / viewportRect.height;
  const width = rect.width / viewportRect.width;
  const height = rect.height / viewportRect.height;

  return {
    left: left,
    top: top,
    width: width,
    height: height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pointInExtendedFrame(u, v) {
  return u > -0.4 && u < 1.4 && v > -0.34 && v < 1.36;
}

function pickWeighted(weights) {
  let total = 0;

  for (let index = 0; index < weights.length; index += 1) {
    total += weights[index];
  }

  let roll = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return index;
  }

  return weights.length - 1;
}

function expandRect(rect, scaleX, scaleY) {
  return {
    centerX: rect.centerX,
    centerY: rect.centerY,
    radiusX: rect.width * scaleX,
    radiusY: rect.height * scaleY
  };
}

function zonePenalty(u, v, zones) {
  let penalty = 0;

  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    const dx = (u - zone.centerX) / zone.radiusX;
    const dy = (v - zone.centerY) / zone.radiusY;
    const distance = dx * dx + dy * dy;

    if (distance < zone.softness) {
      penalty += (1 - distance / zone.softness) * zone.weight;
    }
  }

  return penalty;
}

function makeZone(centerX, centerY, radiusX, radiusY, weight, softness) {
  return {
    centerX: centerX,
    centerY: centerY,
    radiusX: radiusX,
    radiusY: radiusY,
    weight: weight,
    softness: softness
  };
}

function buildZones(layout, isMobile) {
  const headline = layout.headline || layout.copy;
  const copy = layout.copy || headline;
  const tagline = layout.tagline || copy;
  const stats = layout.stats;
  const panel = layout.panel;
  const headlineZone = headline
    ? expandRect(headline, isMobile ? 0.94 : 0.8, isMobile ? 0.76 : 0.58)
    : { centerX: 0.28, centerY: 0.36, radiusX: 0.28, radiusY: 0.19 };
  const copyZone = copy
    ? expandRect(copy, isMobile ? 0.7 : 0.56, isMobile ? 0.46 : 0.34)
    : headlineZone;
  const taglineZone = tagline
    ? expandRect(tagline, isMobile ? 0.66 : 0.5, isMobile ? 0.46 : 0.34)
    : copyZone;
  const statsZone = stats
    ? expandRect(stats, isMobile ? 0.72 : 0.58, isMobile ? 0.52 : 0.3)
    : null;
  const panelZone = panel
    ? expandRect(panel, isMobile ? 0.56 : 0.48, isMobile ? 0.72 : 0.84)
    : { centerX: 0.78, centerY: 0.56, radiusX: 0.16, radiusY: 0.2 };
  const leftSafeZone = makeZone(
    isMobile ? 0.5 : 0.18,
    isMobile ? 0.36 : 0.38,
    isMobile ? 0.34 : 0.22,
    isMobile ? 0.3 : 0.34,
    isMobile ? 1.3 : 1.8,
    isMobile ? 1.06 : 1.08
  );

  const zones = [
    leftSafeZone,
    makeZone(headlineZone.centerX, headlineZone.centerY, headlineZone.radiusX, headlineZone.radiusY, 1.9, 1.0),
    makeZone(copyZone.centerX, copyZone.centerY, copyZone.radiusX, copyZone.radiusY, 1.45, 1.02),
    makeZone(taglineZone.centerX, taglineZone.centerY, taglineZone.radiusX, taglineZone.radiusY, 1.2, 1.04),
    makeZone(panelZone.centerX, panelZone.centerY, panelZone.radiusX, panelZone.radiusY, 1.38, 1.0)
  ];

  if (statsZone) {
    zones.push(makeZone(statsZone.centerX, statsZone.centerY, statsZone.radiusX, statsZone.radiusY, 0.84, 1.0));
  }

  return zones;
}

function deriveHeroShape(layout, isMobile, shapeScale) {
  const panel = layout.panel || { centerX: 0.78, centerY: 0.52 };
  const copy = layout.copy || layout.headline || { left: 0.08, centerX: 0.28, top: 0.16 };

  return {
    centerX: isMobile ? 0.72 : clamp(panel.centerX + 0.12, 0.8, 0.92),
    centerY: isMobile ? 0.3 : clamp(copy.top * 0.16 + 0.3, 0.26, 0.36),
    radiusX: clamp((isMobile ? 0.32 : 0.44) * shapeScale, 0.26, isMobile ? 0.4 : 0.58),
    radiusY: clamp((isMobile ? 0.26 : 0.34) * shapeScale, 0.2, isMobile ? 0.34 : 0.46)
  };
}

function deriveShieldShape(isMobile, shapeScale) {
  return {
    centerX: isMobile ? 0.56 : 0.62,
    centerY: isMobile ? 0.42 : 0.44,
    radiusX: clamp((isMobile ? 0.22 : 0.29) * shapeScale, 0.18, isMobile ? 0.32 : 0.38),
    radiusY: clamp((isMobile ? 0.28 : 0.34) * shapeScale, 0.2, isMobile ? 0.4 : 0.48)
  };
}

function deriveWaveShape(isMobile, shapeScale) {
  return {
    centerX: 0.54,
    centerY: isMobile ? 0.56 : 0.54,
    radiusX: clamp((isMobile ? 0.38 : 0.56) * shapeScale, 0.32, isMobile ? 0.46 : 0.7),
    radiusY: clamp((isMobile ? 0.22 : 0.28) * shapeScale, 0.18, isMobile ? 0.3 : 0.36)
  };
}

function deriveGlobeShape(isMobile, shapeScale) {
  return {
    centerX: isMobile ? 0.58 : 0.64,
    centerY: isMobile ? 0.44 : 0.46,
    radiusX: clamp((isMobile ? 0.24 : 0.32) * shapeScale, 0.2, isMobile ? 0.34 : 0.42),
    radiusY: clamp((isMobile ? 0.24 : 0.32) * shapeScale, 0.2, isMobile ? 0.34 : 0.42)
  };
}

function deriveFooterShape(isMobile, shapeScale) {
  return {
    centerX: 0.5,
    centerY: isMobile ? 0.8 : 0.8,
    radiusX: clamp((isMobile ? 0.42 : 0.62) * shapeScale, 0.3, isMobile ? 0.52 : 0.8),
    radiusY: clamp((isMobile ? 0.18 : 0.22) * shapeScale, 0.12, isMobile ? 0.24 : 0.3)
  };
}

function makeSample(u, v, z, anchorX, anchorY, orbitX, orbitY, depthFactor, orderWeight, rogueWeight) {
  return {
    u: u,
    v: v,
    z: z,
    orbitX: orbitX,
    orbitY: orbitY,
    depthFactor: depthFactor,
    orderWeight: orderWeight,
    rogueWeight: rogueWeight
  };
}

function sampleHeroObject(shape, zones, layerFamily, shapeMode) {
  const penaltyLimit = layerFamily === "ambient" ? 0.46 : layerFamily === "foreground" ? 0.34 : 0.64;

  for (let tries = 0; tries < 140; tries += 1) {
    const modeRoll = Math.random();
    let u = 0;
    let v = 0;
    let z = 0;
    let orbitX = 0;
    let orbitY = 0;
    let depthFactor = 0.5;
    let orderWeight = 0.92;
    let rogueWeight = 0.12;

    if (modeRoll < 0.56) {
      const angle = randomBetween(0, Math.PI * 2);
      const baseRadius = randomBetween(0.76, 1.02);
      const lobeWarp = Math.sin(angle * 2 + 0.45) * 0.11 + Math.cos(angle * 3.2) * 0.05;
      const verticalWarp = Math.sin(angle * 1.8 + 0.7) * 0.05;

      u = shape.centerX + Math.cos(angle) * shape.radiusX * (baseRadius + lobeWarp);
      v = shape.centerY + Math.sin(angle) * shape.radiusY * (baseRadius * 0.8 + verticalWarp);
      z = randomBetween(-10.2, 5.6) + Math.cos(angle - 0.24) * 3.6;
      orbitX = -Math.sin(angle);
      orbitY = Math.cos(angle);
      depthFactor = clamp(0.42 + Math.cos(angle - 0.18) * 0.42, 0.14, 1);
      rogueWeight = randomBetween(0.03, 0.12);
    } else if (modeRoll < 0.86) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const lobeCenterX = shape.centerX + side * shape.radiusX * 0.18;
      const lobeCenterY = shape.centerY + randomBetween(-shape.radiusY * 0.08, shape.radiusY * 0.08);
      const localAngle = randomBetween(0, Math.PI * 2);
      const localRadius = Math.sqrt(Math.random()) * randomBetween(0.18, 0.82);

      u = lobeCenterX + Math.cos(localAngle) * shape.radiusX * 0.36 * localRadius;
      v = lobeCenterY + Math.sin(localAngle) * shape.radiusY * 0.42 * localRadius;
      z = randomBetween(-10.8, 3.6) + (1 - localRadius * localRadius) * 5.8;
      orbitX = -Math.sin(localAngle);
      orbitY = Math.cos(localAngle);
      depthFactor = clamp(0.3 + (1 - localRadius) * 0.74, 0.18, 1);
      orderWeight = randomBetween(0.84, 0.98);
      rogueWeight = randomBetween(0.05, 0.16);
    } else {
      const t = randomBetween(-1, 1);
      const ribWave = Math.sin(t * 6.4 + randomBetween(-0.28, 0.28)) * shape.radiusX * (shapeMode === "orbital" ? 0.06 : 0.085);

      u = shape.centerX - shape.radiusX * 0.02 + ribWave + randomBetween(-0.02, 0.02);
      v = shape.centerY + t * shape.radiusY * 0.88;
      z = randomBetween(-9.8, 4.2) + Math.cos(t * Math.PI) * 3.2;
      orbitX = Math.cos(t * 4.6);
      orbitY = Math.sin(t * 4.6);
      depthFactor = clamp(0.28 + (1 - Math.abs(t)) * 0.66, 0.16, 1);
      orderWeight = randomBetween(0.88, 1);
      rogueWeight = randomBetween(0.05, 0.14);
    }

    if (!pointInExtendedFrame(u, v) || zonePenalty(u, v, zones) > penaltyLimit) continue;

    return makeSample(u, v, z, shape.centerX, shape.centerY, orbitX, orbitY, depthFactor, orderWeight, rogueWeight);
  }

  return null;
}

function shieldWidthAt(y) {
  if (y < -0.42) {
    const arcT = (y + 1) / 0.58;
    return 0.28 + Math.sin(arcT * Math.PI) * 0.44;
  }

  if (y < 0.12) {
    return 0.78 - (y + 0.42) * 0.18;
  }

  const taper = clamp((y - 0.12) / 0.88, 0, 1);
  return 0.76 * Math.pow(1 - taper, 0.72);
}

function sampleShieldObject(shape, layerFamily) {
  for (let tries = 0; tries < 140; tries += 1) {
    const useShackle = Math.random() < 0.18;
    let u = 0;
    let v = 0;
    let z = 0;
    let orbitX = 0;
    let orbitY = 0;
    let depthFactor = 0.4;
    let orderWeight = 0.9;
    let rogueWeight = 0.1;

    if (useShackle) {
      const angle = randomBetween(Math.PI * 0.1, Math.PI * 0.9);
      const shackleRadiusX = shape.radiusX * 0.32;
      const shackleRadiusY = shape.radiusY * 0.24;

      u = shape.centerX + Math.cos(angle) * shackleRadiusX;
      v = shape.centerY - shape.radiusY * 0.7 + Math.sin(angle) * shackleRadiusY;
      z = randomBetween(-10.2, 4.2) + Math.cos(angle) * 1.8;
      orbitX = -Math.sin(angle);
      orbitY = Math.cos(angle);
      depthFactor = randomBetween(0.42, 0.86);
      rogueWeight = randomBetween(0.04, 0.14);
    } else {
      const onShell = Math.random() < 0.62 || layerFamily === "foreground";
      const yNorm = onShell
        ? randomBetween(-1, 1)
        : Math.pow(Math.random(), 0.72) * 2 - 1;
      const widthNorm = shieldWidthAt(yNorm);
      const xNorm = onShell
        ? (Math.random() < 0.5 ? -1 : 1) * widthNorm * randomBetween(0.9, 1.04)
        : randomBetween(-widthNorm * 0.78, widthNorm * 0.78);
      const wobble = Math.sin((yNorm + 0.18) * 5.6) * 0.06;

      u = shape.centerX + (xNorm + wobble) * shape.radiusX;
      v = shape.centerY + yNorm * shape.radiusY;
      z = randomBetween(-11.8, 4.6) + (1 - Math.abs(yNorm)) * 5.8 - Math.abs(xNorm) * 2.4;
      orbitX = -yNorm;
      orbitY = xNorm;
      depthFactor = clamp(0.3 + (1 - Math.abs(xNorm)) * 0.52 + (1 - Math.abs(yNorm)) * 0.18, 0.16, 1);
      orderWeight = randomBetween(0.8, 1);
      rogueWeight = randomBetween(0.04, 0.16);
    }

    if (!pointInExtendedFrame(u, v)) continue;

    return makeSample(u, v, z, shape.centerX, shape.centerY, orbitX, orbitY, depthFactor, orderWeight, rogueWeight);
  }

  return null;
}

function sampleWaveField(shape, isMobile, layerFamily) {
  const bandCount = isMobile ? 5 : 7;

  for (let tries = 0; tries < 140; tries += 1) {
    const bandIndex = Math.floor(Math.random() * bandCount);
    const bandMix = bandCount === 1 ? 0 : bandIndex / (bandCount - 1);
    const bandOffset = (bandMix - 0.5) * 2;
    const xNorm = randomBetween(-1.08, 1.08);
    const baseWave = Math.sin(xNorm * 6.2 + bandOffset * 3.8) * 0.18;
    const ripple = Math.sin(xNorm * 13.6 + bandOffset * 5.4) * 0.05;
    const yNorm = bandOffset * 0.7 + baseWave + ripple;
    const widthT = (xNorm + 1.08) / 2.16;
    const slope = Math.cos(xNorm * 6.2 + bandOffset * 3.8) * 0.56;
    const tilt = Math.sin(widthT * Math.PI) * 0.08;
    const u = shape.centerX + xNorm * shape.radiusX;
    const v = shape.centerY + (yNorm + tilt) * shape.radiusY;
    const z = randomBetween(-11.4, 6.2)
      + Math.sin(xNorm * 4.8 + bandOffset * 3.6) * 3.8
      + (layerFamily === "foreground" ? randomBetween(1.6, 3.4) : 0);
    const tangentLength = Math.hypot(1, slope) || 1;
    const depthFactor = clamp(0.24 + (1 - Math.abs(bandOffset)) * 0.62, 0.16, 1);

    if (!pointInExtendedFrame(u, v)) continue;

    return makeSample(
      u,
      v,
      z,
      shape.centerX,
      shape.centerY,
      1 / tangentLength,
      slope / tangentLength,
      depthFactor,
      randomBetween(0.82, 1),
      randomBetween(0.04, 0.14)
    );
  }

  return null;
}

function sampleGlobe(shape, layerFamily) {
  for (let tries = 0; tries < 140; tries += 1) {
    const useBands = Math.random() < 0.62 || layerFamily === "foreground";

    if (useBands) {
      const latitude = randomBetween(-1, 1);
      const longitude = randomBetween(0, Math.PI * 2);
      const ring = Math.cos(latitude * Math.PI * 0.5);
      const wobble = Math.sin(longitude * 2.2 + latitude * 2.8) * 0.06;
      const u = shape.centerX + Math.cos(longitude) * shape.radiusX * ring * (0.9 + wobble);
      const v = shape.centerY + Math.sin(latitude * Math.PI * 0.5) * shape.radiusY + Math.sin(longitude) * shape.radiusY * 0.18 * ring;
      const z = randomBetween(-10.6, 7.4) + ring * 4.6 + Math.cos(longitude * 1.6) * 2.4;

      if (!pointInExtendedFrame(u, v)) continue;

      return makeSample(
        u,
        v,
        z,
        shape.centerX,
        shape.centerY,
        -Math.sin(longitude),
        Math.cos(longitude),
        clamp(0.3 + ring * 0.62, 0.18, 1),
        randomBetween(0.84, 1),
        randomBetween(0.04, 0.14)
      );
    }

    const angle = randomBetween(0, Math.PI * 2);
    const radial = Math.sqrt(Math.random()) * randomBetween(0.12, 0.84);
    const u = shape.centerX + Math.cos(angle) * shape.radiusX * radial;
    const v = shape.centerY + Math.sin(angle) * shape.radiusY * radial;
    const dome = 1 - radial * radial;

    if (!pointInExtendedFrame(u, v)) continue;

    return makeSample(
      u,
      v,
      randomBetween(-12.2, 4.8) + dome * 6.4,
      shape.centerX,
      shape.centerY,
      -Math.sin(angle),
      Math.cos(angle),
      clamp(0.26 + dome * 0.72, 0.16, 1),
      randomBetween(0.72, 0.94),
      randomBetween(0.08, 0.18)
    );
  }

  return null;
}

function sampleFooterHalo(shape, layerFamily) {
  for (let tries = 0; tries < 140; tries += 1) {
    const ring = Math.random() < 0.7 || layerFamily === "foreground";
    const angle = randomBetween(Math.PI * 0.06, Math.PI * 0.94);
    const radial = ring ? randomBetween(0.82, 1.1) : Math.sqrt(Math.random()) * 0.88;
    const archLift = Math.sin(angle) * 0.16;
    const u = shape.centerX + Math.cos(angle) * shape.radiusX * radial;
    const v = shape.centerY - Math.sin(angle) * shape.radiusY * radial - archLift * shape.radiusY;
    const z = randomBetween(-11.4, 5.2) + Math.sin(angle) * 3.4 + (ring ? 1.2 : 0);

    if (!pointInExtendedFrame(u, v)) continue;

    return makeSample(
      u,
      v,
      z,
      shape.centerX,
      shape.centerY,
      -Math.sin(angle),
      -Math.cos(angle),
      clamp(0.24 + Math.sin(angle) * 0.62, 0.14, 0.96),
      randomBetween(0.84, 1),
      randomBetween(0.04, 0.14)
    );
  }

  return null;
}

function sampleAmbient(primaryShape, zones, isMobile) {
  for (let tries = 0; tries < 160; tries += 1) {
    const region = Math.random();
    let u = 0;
    let v = 0;

    if (region < 0.08) {
      u = randomBetween(-0.02, 0.18);
      v = randomBetween(0.14, 0.82);
    } else if (region < 0.52) {
      u = randomBetween(0.54, 1.18);
      v = randomBetween(-0.1, 0.32);
    } else if (region < 0.86) {
      u = randomBetween(0.72, 1.18);
      v = randomBetween(0.1, isMobile ? 0.94 : 0.78);
    } else {
      u = randomBetween(0.52, 1.06);
      v = randomBetween(0.58, 1.02);
    }

    if (!pointInExtendedFrame(u, v) || zonePenalty(u, v, zones) > 0.42) continue;

    const dx = u - primaryShape.centerX;
    const dy = v - primaryShape.centerY;
    const distance = Math.hypot(dx, dy) || 1;

    return makeSample(
      u,
      v,
      randomBetween(-15.8, 3.2),
      primaryShape.centerX,
      primaryShape.centerY,
      -dy / distance,
      dx / distance,
      clamp(randomBetween(0.18, 0.68), 0.12, 0.86),
      randomBetween(0.16, 0.42),
      randomBetween(0.68, 1)
    );
  }

  return null;
}

function sampleForeground(zones, isMobile) {
  for (let tries = 0; tries < 160; tries += 1) {
    const region = Math.random();
    let u = 0;
    let v = 0;

    if (region < 0.68) {
      u = randomBetween(0.66, 1.14);
      v = randomBetween(-0.12, 0.42);
    } else if (region < 0.92) {
      u = randomBetween(0.72, 1.08);
      v = randomBetween(0.38, 0.82);
    } else {
      u = randomBetween(0.14, 0.3);
      v = randomBetween(0.7, 0.98);
    }

    if (!pointInExtendedFrame(u, v) || zonePenalty(u, v, zones) > 0.26) continue;

    const directionX = Math.random() < 0.5 ? -1 : 1;
    const directionY = Math.random() < 0.5 ? -1 : 1;

    return makeSample(
      u,
      v,
      randomBetween(3.8, 10.6),
      u,
      v,
      directionX * randomBetween(0.22, 0.76),
      directionY * randomBetween(0.22, 0.76),
      randomBetween(0.76, 1),
      randomBetween(0.14, 0.34),
      randomBetween(0.82, 1)
    );
  }

  return null;
}

function buildScatterTarget(anchor, heroShape, scatterDistance, layerFamily) {
  const directionX = anchor.u - heroShape.centerX;
  const directionY = anchor.v - heroShape.centerY;
  const directionLength = Math.hypot(directionX, directionY) || 1;
  const radialX = directionX / directionLength;
  const radialY = directionY / directionLength;
  const tangentX = -radialY;
  const tangentY = radialX;
  const distanceMultiplier = layerFamily === "foreground"
    ? randomBetween(1.2, 1.8)
    : layerFamily === "ambient"
      ? randomBetween(0.9, 1.4)
      : randomBetween(1.05, 1.6);
  const radialDistance = heroShape.radiusX * scatterDistance * distanceMultiplier;
  const tangentialDistance = heroShape.radiusY * randomBetween(-0.94, 0.94);
  const zDistance = layerFamily === "foreground"
    ? randomBetween(7, 12)
    : randomBetween(-7, 10);

  return {
    u: anchor.u + radialX * radialDistance + tangentX * tangentialDistance,
    v: anchor.v + radialY * radialDistance * 0.86 + tangentY * tangentialDistance * 0.78,
    z: anchor.z + zDistance
  };
}

function pickColorProfile(sample, layerFamily) {
  if (layerFamily === "foreground") return "bright";
  if (layerFamily === "ambient") {
    return sample.u < 0.28 || sample.v > 0.66 ? "cool" : "mixed";
  }

  if (sample.u > 0.66 && sample.v < 0.5) return "bright";
  if (sample.u > 0.5) return "warm";
  return "mixed";
}

function pickPaletteIndex(palette, profileName) {
  const profile = COLOR_PROFILES[profileName] || COLOR_PROFILES.mixed;
  const weights = new Array(palette.length);

  for (let index = 0; index < palette.length; index += 1) {
    weights[index] = (palette[index].weight || 0.1) * (profile[index] || 0.01);
  }

  return pickWeighted(weights);
}

function buildSampleStyle(formations, scatter, layerFamily, palette, colorIntensity) {
  const colorProfile = pickColorProfile(formations.hero, layerFamily);
  const paletteIndex = pickPaletteIndex(palette, colorProfile);
  const alphaRange = palette[paletteIndex].alpha;
  const scale = layerFamily === "foreground"
    ? randomBetween(0.034, 0.062)
    : layerFamily === "ambient"
      ? randomBetween(0.014, 0.03)
      : randomBetween(0.022, 0.048);
  const alpha = randomBetween(alphaRange[0], alphaRange[1]) * colorIntensity;

  return {
    layerFamily: layerFamily,
    formations: formations,
    scatter: scatter,
    colorIndex: paletteIndex,
    scale: scale,
    alpha: alpha,
    phase: Math.random() * Math.PI * 2,
    spin: layerFamily === "foreground" ? randomBetween(0.04, 0.12) : randomBetween(0.02, 0.08),
    shear: randomBetween(0.92, 1.12),
    flow: layerFamily === "main" ? randomBetween(0.08, 0.18) : randomBetween(0.04, 0.12),
    noise: layerFamily === "foreground" ? randomBetween(0.04, 0.1) : randomBetween(0.02, 0.06),
    returnStrength: layerFamily === "foreground" ? randomBetween(2.1, 3.1) : randomBetween(1.7, 2.6),
    interactionWeight: layerFamily === "ambient" ? randomBetween(0.12, 0.2) : randomBetween(0.18, 0.3),
    depthFactor: formations.hero.depthFactor,
    orderWeight: (formations.browse.orderWeight + formations.directory.orderWeight + formations.insights.orderWeight) / 3,
    rogueWeight: Math.max(formations.hero.rogueWeight, formations.directory.rogueWeight),
    foregroundWeight: layerFamily === "foreground" ? 1 : 0,
    ambientWeight: layerFamily === "ambient" ? 1 : 0
  };
}

function buildFormationSet(heroShape, shieldShape, waveShape, globeShape, footerShape, zones, isMobile, layerFamily, shapeMode) {
  const hero = layerFamily === "ambient"
    ? sampleAmbient(heroShape, zones, isMobile) || sampleHeroObject(heroShape, zones, layerFamily, shapeMode)
    : layerFamily === "foreground"
      ? sampleForeground(zones, isMobile) || sampleHeroObject(heroShape, zones, layerFamily, shapeMode)
      : sampleHeroObject(heroShape, zones, layerFamily, shapeMode);
  const browse = layerFamily === "ambient"
    ? sampleShieldObject(shieldShape, "main") || sampleAmbient(shieldShape, zones, isMobile)
    : sampleShieldObject(shieldShape, layerFamily);
  const directory = layerFamily === "ambient"
    ? sampleWaveField(waveShape, isMobile, "main") || sampleAmbient(waveShape, zones, isMobile)
    : sampleWaveField(waveShape, isMobile, layerFamily);
  const insights = layerFamily === "ambient"
    ? sampleGlobe(globeShape, "main") || sampleAmbient(globeShape, zones, isMobile)
    : sampleGlobe(globeShape, layerFamily);
  const footer = layerFamily === "ambient"
    ? sampleFooterHalo(footerShape, "main") || sampleAmbient(footerShape, zones, isMobile)
    : sampleFooterHalo(footerShape, layerFamily);

  if (!hero || !browse || !directory || !insights || !footer) {
    return null;
  }

  return {
    hero: hero,
    browse: browse,
    directory: directory,
    insights: insights,
    footer: footer
  };
}

export function measureHeroLayout(root, viewportElement) {
  const viewportRect = viewportElement.getBoundingClientRect();

  function read(selector) {
    const element = root.querySelector(selector);
    if (!element) return null;
    return rectToViewportSpace(element.getBoundingClientRect(), viewportRect);
  }

  return {
    viewportWidth: viewportRect.width,
    viewportHeight: viewportRect.height,
    copy: read(".hero-copy"),
    headline: read("h1"),
    tagline: read(".hero-tagline"),
    stats: read(".hero-stats"),
    panel: read(".hero-panel")
  };
}

export function applyHeroCssVars(root, composition, layout) {
  root.style.setProperty("--hero-halo-x", (composition.halo.centerX * 100).toFixed(2) + "%");
  root.style.setProperty("--hero-halo-y", (composition.halo.centerY * 100).toFixed(2) + "%");
  root.style.setProperty("--hero-panel-x", (((layout.panel ? clamp(layout.panel.centerX, 0.56, 0.88) : 0.78) * 100).toFixed(2)) + "%");
  root.style.setProperty("--hero-panel-y", (((layout.panel ? clamp(layout.panel.centerY, 0.4, 0.74) : 0.56) * 100).toFixed(2)) + "%");
  root.style.setProperty("--hero-copy-x", (((layout.headline ? layout.headline.centerX : 0.3) * 100).toFixed(2)) + "%");
  root.style.setProperty("--hero-copy-y", (((layout.headline ? clamp(layout.headline.centerY, 0.3, 0.6) : 0.42) * 100).toFixed(2)) + "%");
}

export function buildHeroComposition(options) {
  const layout = options.layout;
  const isMobile = layout.viewportWidth < 640;
  const shapeScale = options.shapeScale || 1;
  const heroShape = deriveHeroShape(layout, isMobile, shapeScale);
  const shieldShape = deriveShieldShape(isMobile, shapeScale);
  const waveShape = deriveWaveShape(isMobile, shapeScale);
  const globeShape = deriveGlobeShape(isMobile, shapeScale);
  const footerShape = deriveFooterShape(isMobile, shapeScale);
  const zones = buildZones(layout, isMobile);
  const palette = options.palette;
  const shapeMode = options.shapeMode || "grc";
  const targetCount = options.particleCount + options.ambientCount + options.foregroundCount;
  const samples = [];

  while (samples.length < targetCount) {
    const index = samples.length;
    const layerFamily = index < options.particleCount
      ? "main"
      : index < options.particleCount + options.ambientCount
        ? "ambient"
        : "foreground";
    const formations = buildFormationSet(
      heroShape,
      shieldShape,
      waveShape,
      globeShape,
      footerShape,
      zones,
      isMobile,
      layerFamily,
      shapeMode
    );

    if (!formations) break;

    const scatter = buildScatterTarget(formations.hero, heroShape, options.scatterDistance, layerFamily);
    samples.push(buildSampleStyle(formations, scatter, layerFamily, palette, options.colorIntensity));
  }

  return {
    halo: heroShape,
    layout: layout,
    zones: zones,
    samples: samples
  };
}

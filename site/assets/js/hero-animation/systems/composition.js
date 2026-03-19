import { clamp } from "../config.js";
import { getTargetPoints, getScatterPositions } from "./morph-targets.js";

var COLOR_PROFILES = {
  bright: [0.38, 0.34, 0.14, 0.04, 0.04, 0.06],
  warm: [0.18, 0.44, 0.22, 0.04, 0.03, 0.09],
  mixed: [0.16, 0.28, 0.16, 0.12, 0.1, 0.18],
  cool: [0.1, 0.18, 0.12, 0.2, 0.16, 0.24]
};

function rectToViewportSpace(rect, viewportRect) {
  var left = (rect.left - viewportRect.left) / viewportRect.width;
  var top = (rect.top - viewportRect.top) / viewportRect.height;
  var width = rect.width / viewportRect.width;
  var height = rect.height / viewportRect.height;

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

function pickWeighted(weights) {
  var total = 0;

  for (var index = 0; index < weights.length; index += 1) {
    total += weights[index];
  }

  var roll = Math.random() * total;
  for (var index = 0; index < weights.length; index += 1) {
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
  var profile = COLOR_PROFILES[profileName] || COLOR_PROFILES.mixed;
  var weights = new Array(palette.length);

  for (var index = 0; index < palette.length; index += 1) {
    weights[index] = (palette[index].weight || 0.1) * (profile[index] || 0.01);
  }

  return pickWeighted(weights);
}

export function measureHeroLayout(root, viewportElement) {
  var viewportRect = viewportElement.getBoundingClientRect();

  function read(selector) {
    var element = root.querySelector(selector);
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
  var layout = options.layout;
  var isMobile = layout.viewportWidth < 640;
  var shapeScale = options.shapeScale || 1;
  var palette = options.palette;
  var colorIntensity = options.colorIntensity || 1;
  var scatterDistance = options.scatterDistance || 2.15;
  var mainCount = options.particleCount;
  var ambientCount = options.ambientCount;
  var foregroundCount = options.foregroundCount;
  var totalCount = mainCount + ambientCount + foregroundCount;

  var shieldOpts = {
    centerX: isMobile ? 0.58 : 0.68,
    centerY: isMobile ? 0.42 : 0.46,
    radiusX: clamp((isMobile ? 0.26 : 0.34) * shapeScale, 0.2, isMobile ? 0.34 : 0.44),
    radiusY: clamp((isMobile ? 0.32 : 0.40) * shapeScale, 0.24, isMobile ? 0.42 : 0.52)
  };
  var gridOpts = {
    centerX: 0.54,
    centerY: isMobile ? 0.52 : 0.5,
    radiusX: clamp((isMobile ? 0.36 : 0.48) * shapeScale, 0.3, isMobile ? 0.44 : 0.6),
    radiusY: clamp((isMobile ? 0.22 : 0.26) * shapeScale, 0.18, isMobile ? 0.3 : 0.34)
  };
  var networkOpts = {
    centerX: isMobile ? 0.52 : 0.56,
    centerY: isMobile ? 0.48 : 0.46,
    radiusX: clamp((isMobile ? 0.3 : 0.4) * shapeScale, 0.24, isMobile ? 0.38 : 0.5),
    radiusY: clamp((isMobile ? 0.24 : 0.3) * shapeScale, 0.2, isMobile ? 0.32 : 0.4)
  };
  var globeOpts = {
    centerX: isMobile ? 0.58 : 0.64,
    centerY: isMobile ? 0.44 : 0.46,
    radiusX: clamp((isMobile ? 0.24 : 0.32) * shapeScale, 0.2, isMobile ? 0.34 : 0.42),
    radiusY: clamp((isMobile ? 0.24 : 0.32) * shapeScale, 0.2, isMobile ? 0.34 : 0.42)
  };
  var footerOpts = {
    centerX: 0.5,
    centerY: isMobile ? 0.78 : 0.76,
    radiusX: clamp((isMobile ? 0.42 : 0.6) * shapeScale, 0.3, isMobile ? 0.52 : 0.76),
    radiusY: clamp((isMobile ? 0.18 : 0.22) * shapeScale, 0.12, isMobile ? 0.24 : 0.3)
  };

  var shield = getTargetPoints("shield", mainCount, shieldOpts);
  var grid = getTargetPoints("grid", mainCount, gridOpts);
  var network = getTargetPoints("network", mainCount, networkOpts);
  var globe = getTargetPoints("globe", mainCount, globeOpts);
  var footer = getTargetPoints("disperse", mainCount, footerOpts);
  var scatter = getScatterPositions(
    shield.positions,
    mainCount,
    { x: shieldOpts.centerX, y: shieldOpts.centerY },
    scatterDistance
  );

  var targets = [
    { positions: shield.positions, orbits: shield.orbitVectors },
    { positions: grid.positions, orbits: grid.orbitVectors },
    { positions: network.positions, orbits: network.orbitVectors },
    { positions: globe.positions, orbits: globe.orbitVectors },
    { positions: footer.positions, orbits: footer.orbitVectors }
  ];
  var formationKeys = ["hero", "browse", "directory", "insights", "footer"];
  var samples = [];

  // --- Main particles: form the morph-target shapes ---
  for (var i = 0; i < mainCount; i += 1) {
    var offset3 = i * 3;
    var offset2 = i * 2;
    var formations = {};

    for (var f = 0; f < 5; f += 1) {
      formations[formationKeys[f]] = {
        u: targets[f].positions[offset3],
        v: targets[f].positions[offset3 + 1],
        z: targets[f].positions[offset3 + 2],
        orbitX: targets[f].orbits[offset2],
        orbitY: targets[f].orbits[offset2 + 1],
        depthFactor: clamp(0.3 + Math.abs(targets[f].positions[offset3 + 2]) * 0.06, 0.15, 1),
        orderWeight: randomBetween(0.8, 1),
        rogueWeight: randomBetween(0.04, 0.16)
      };
    }

    var particleScatter = {
      u: scatter[offset3],
      v: scatter[offset3 + 1],
      z: scatter[offset3 + 2]
    };

    var colorProfile = pickColorProfile(formations.hero, "main");
    var paletteIndex = pickPaletteIndex(palette, colorProfile);
    var alphaRange = palette[paletteIndex].alpha;

    samples.push({
      layerFamily: "main",
      formations: formations,
      scatter: particleScatter,
      colorIndex: paletteIndex,
      scale: randomBetween(0.028, 0.056),
      alpha: randomBetween(alphaRange[0], alphaRange[1]) * colorIntensity,
      phase: Math.random() * Math.PI * 2,
      spin: randomBetween(0.02, 0.08),
      shear: randomBetween(0.92, 1.12),
      flow: randomBetween(0.08, 0.18),
      noise: randomBetween(0.02, 0.06),
      returnStrength: randomBetween(1.7, 2.6),
      interactionWeight: 0,
      depthFactor: formations.hero.depthFactor,
      orderWeight: (formations.browse.orderWeight + formations.directory.orderWeight + formations.insights.orderWeight) / 3,
      rogueWeight: Math.max(formations.hero.rogueWeight, formations.directory.rogueWeight),
      foregroundWeight: 0,
      ambientWeight: 0
    });
  }

  // --- Ambient particles: peripheral background, separate from formations ---
  for (var a = 0; a < ambientCount; a += 1) {
    var region = Math.random();
    var au = 0;
    var av = 0;

    if (region < 0.08) {
      au = randomBetween(-0.02, 0.18);
      av = randomBetween(0.14, 0.82);
    } else if (region < 0.52) {
      au = randomBetween(0.54, 1.18);
      av = randomBetween(-0.1, 0.32);
    } else if (region < 0.86) {
      au = randomBetween(0.72, 1.18);
      av = randomBetween(0.1, isMobile ? 0.94 : 0.78);
    } else {
      au = randomBetween(0.52, 1.06);
      av = randomBetween(0.58, 1.02);
    }

    var az = randomBetween(-8, -2);
    var adx = au - shieldOpts.centerX;
    var ady = av - shieldOpts.centerY;
    var adist = Math.hypot(adx, ady) || 1;
    var ambientFormations = {};

    for (var af = 0; af < 5; af += 1) {
      ambientFormations[formationKeys[af]] = {
        u: au + randomBetween(-0.04, 0.04) * af,
        v: av + randomBetween(-0.03, 0.03) * af,
        z: az + randomBetween(-1, 1),
        orbitX: -ady / adist,
        orbitY: adx / adist,
        depthFactor: clamp(randomBetween(0.18, 0.68), 0.12, 0.86),
        orderWeight: randomBetween(0.16, 0.42),
        rogueWeight: randomBetween(0.68, 1)
      };
    }

    var ambientScatter = {
      u: au + randomBetween(-0.12, 0.12),
      v: av + randomBetween(-0.1, 0.1),
      z: az + randomBetween(-3, 2)
    };

    var ambientColor = pickColorProfile(ambientFormations.hero, "ambient");
    var ambientPalIdx = pickPaletteIndex(palette, ambientColor);
    var ambientAlphaRange = palette[ambientPalIdx].alpha;

    samples.push({
      layerFamily: "ambient",
      formations: ambientFormations,
      scatter: ambientScatter,
      colorIndex: ambientPalIdx,
      scale: randomBetween(0.014, 0.03),
      alpha: randomBetween(ambientAlphaRange[0], ambientAlphaRange[1]) * colorIntensity * 0.7,
      phase: Math.random() * Math.PI * 2,
      spin: randomBetween(0.02, 0.06),
      shear: randomBetween(0.92, 1.12),
      flow: randomBetween(0.04, 0.12),
      noise: randomBetween(0.02, 0.06),
      returnStrength: randomBetween(1.2, 1.8),
      interactionWeight: 0,
      depthFactor: randomBetween(0.2, 0.6),
      orderWeight: randomBetween(0.16, 0.42),
      rogueWeight: randomBetween(0.68, 1),
      foregroundWeight: 0,
      ambientWeight: 1
    });
  }

  // --- Foreground particles: large, bright, near-camera, separate from formations ---
  for (var fg = 0; fg < foregroundCount; fg += 1) {
    var fgRegion = Math.random();
    var fu = 0;
    var fv = 0;

    if (fgRegion < 0.68) {
      fu = randomBetween(0.66, 1.14);
      fv = randomBetween(-0.12, 0.42);
    } else if (fgRegion < 0.92) {
      fu = randomBetween(0.72, 1.08);
      fv = randomBetween(0.38, 0.82);
    } else {
      fu = randomBetween(0.14, 0.3);
      fv = randomBetween(0.7, 0.98);
    }

    var fz = randomBetween(3.8, 8);
    var fgFormations = {};

    for (var ff = 0; ff < 5; ff += 1) {
      fgFormations[formationKeys[ff]] = {
        u: fu + randomBetween(-0.03, 0.03) * ff,
        v: fv + randomBetween(-0.02, 0.02) * ff,
        z: fz + randomBetween(-0.5, 0.5),
        orbitX: (Math.random() < 0.5 ? -1 : 1) * randomBetween(0.22, 0.76),
        orbitY: (Math.random() < 0.5 ? -1 : 1) * randomBetween(0.22, 0.76),
        depthFactor: randomBetween(0.76, 1),
        orderWeight: randomBetween(0.14, 0.34),
        rogueWeight: randomBetween(0.82, 1)
      };
    }

    var fgScatter = {
      u: fu + randomBetween(-0.15, 0.15),
      v: fv + randomBetween(-0.12, 0.12),
      z: fz + randomBetween(1, 4)
    };

    var fgColor = pickColorProfile(fgFormations.hero, "foreground");
    var fgPalIdx = pickPaletteIndex(palette, fgColor);
    var fgAlphaRange = palette[fgPalIdx].alpha;

    samples.push({
      layerFamily: "foreground",
      formations: fgFormations,
      scatter: fgScatter,
      colorIndex: fgPalIdx,
      scale: randomBetween(0.034, 0.062),
      alpha: randomBetween(fgAlphaRange[0], fgAlphaRange[1]) * colorIntensity,
      phase: Math.random() * Math.PI * 2,
      spin: randomBetween(0.04, 0.12),
      shear: randomBetween(0.92, 1.12),
      flow: randomBetween(0.04, 0.12),
      noise: randomBetween(0.04, 0.1),
      returnStrength: randomBetween(2.1, 3.1),
      interactionWeight: 0,
      depthFactor: randomBetween(0.76, 1),
      orderWeight: randomBetween(0.14, 0.34),
      rogueWeight: randomBetween(0.82, 1),
      foregroundWeight: 1,
      ambientWeight: 0
    });
  }

  return {
    halo: shieldOpts,
    layout: layout,
    samples: samples
  };
}

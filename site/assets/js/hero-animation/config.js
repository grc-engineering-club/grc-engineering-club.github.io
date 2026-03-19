const BASE_REFERENCE_AREA = 1440 * 980;

export const HERO_QUALITY_PRESETS = {
  high: { mainCount: 980, ambientCount: 220, foregroundCount: 18, dprClamp: 1.55 },
  medium: { mainCount: 780, ambientCount: 176, foregroundCount: 14, dprClamp: 1.35 },
  low: { mainCount: 560, ambientCount: 132, foregroundCount: 10, dprClamp: 1.18 },
  mobile: { mainCount: 440, ambientCount: 84, foregroundCount: 8, dprClamp: 1.06 }
};

export const HERO_COLOR_PALETTES = {
  dark: [
    { hex: "#f6efe8", weight: 0.24, alpha: [0.34, 0.9] },
    { hex: "#f0b14d", weight: 0.3, alpha: [0.3, 0.82] },
    { hex: "#d9a24f", weight: 0.18, alpha: [0.24, 0.72] },
    { hex: "#74b0cf", weight: 0.08, alpha: [0.18, 0.46] },
    { hex: "#956ed0", weight: 0.08, alpha: [0.18, 0.44] },
    { hex: "#5ab09d", weight: 0.12, alpha: [0.18, 0.48] }
  ],
  light: [
    { hex: "#fff7ef", weight: 0.24, alpha: [0.18, 0.46] },
    { hex: "#e79b2d", weight: 0.3, alpha: [0.16, 0.4] },
    { hex: "#c98725", weight: 0.18, alpha: [0.14, 0.34] },
    { hex: "#4f84a8", weight: 0.1, alpha: [0.1, 0.24] },
    { hex: "#7454b1", weight: 0.08, alpha: [0.1, 0.22] },
    { hex: "#3d927f", weight: 0.1, alpha: [0.1, 0.22] }
  ]
};

export const DEFAULT_HERO_ANIMATION_CONFIG = {
  qualityMode: "auto",
  particleCount: null,
  ambientCount: null,
  foregroundCount: null,
  shapeScale: 0.98,
  shapeMode: "grc",
  interactionStrength: 0.006,
  motionEasing: 1.7,
  cameraEasing: 0.8,
  scrollSmoothing: 3.6,
  scrollVelocityClamp: 0.24,
  reassemblyWindow: 0.56,
  scatterDistance: 2.15,
  rotateSpeed: 0.58,
  driftSpeed: 0.42,
  idleRotationStrength: 0.82,
  idleDriftStrength: 0.64,
  pointerRotationStrength: 0.05,
  cameraDriftStrength: 0.06,
  colorIntensity: 1.08,
  chapterProgress: null,
  entranceEnabled: true,
  colorPalette: HERO_COLOR_PALETTES.dark,
  entranceDurationMs: 1950,
  pointerRadius: 0.16
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function hexToRgb(hex) {
  const normalized = String(hex || "#ffffff").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map(function (part) { return part + part; }).join("")
    : normalized;

  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255
  };
}

export function resolveHeroQualityMode(options) {
  const mode = options.qualityMode || DEFAULT_HERO_ANIMATION_CONFIG.qualityMode;
  if (mode !== "auto") return mode;

  if (options.reducedMotion) return "low";
  if (options.viewportWidth < 640) return "mobile";
  if (options.hardwareConcurrency && options.hardwareConcurrency < 4) return "low";
  if (options.viewportWidth * options.viewportHeight > 1280 * 900) return "high";
  return "medium";
}

function scaleCountToViewport(baseCount, viewportWidth, viewportHeight, minFactor, maxFactor) {
  const areaScale = Math.sqrt((viewportWidth * viewportHeight) / BASE_REFERENCE_AREA);
  return Math.round(baseCount * clamp(areaScale, minFactor, maxFactor));
}

export function getPaletteForTheme(theme, config) {
  if (config && Array.isArray(config.colorPalette)) {
    return config.colorPalette;
  }

  return theme === "light"
    ? HERO_COLOR_PALETTES.light
    : HERO_COLOR_PALETTES.dark;
}

export function resolveHeroAnimationConfig(userConfig, runtime) {
  const merged = {
    ...DEFAULT_HERO_ANIMATION_CONFIG,
    ...(userConfig || {})
  };

  const qualityMode = resolveHeroQualityMode({
    qualityMode: merged.qualityMode,
    reducedMotion: runtime.reducedMotion,
    hardwareConcurrency: runtime.hardwareConcurrency,
    viewportWidth: runtime.viewportWidth,
    viewportHeight: runtime.viewportHeight
  });
  const preset = HERO_QUALITY_PRESETS[qualityMode];

  return {
    ...merged,
    qualityMode: qualityMode,
    particleCount: merged.particleCount || scaleCountToViewport(
      preset.mainCount,
      runtime.viewportWidth,
      runtime.viewportHeight,
      0.74,
      1.12
    ),
    ambientCount: merged.ambientCount || scaleCountToViewport(
      preset.ambientCount,
      runtime.viewportWidth,
      runtime.viewportHeight,
      0.72,
      1.08
    ),
    foregroundCount: merged.foregroundCount || scaleCountToViewport(
      preset.foregroundCount,
      runtime.viewportWidth,
      runtime.viewportHeight,
      0.7,
      1.05
    ),
    dprClamp: merged.dprClamp || preset.dprClamp,
    colorPalette: getPaletteForTheme(runtime.theme, merged)
  };
}

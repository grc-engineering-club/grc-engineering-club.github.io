import { resolveHeroAnimationConfig, getPaletteForTheme } from "./config.js";
import { createHeroRenderer } from "./systems/render.js";

export { DEFAULT_HERO_ANIMATION_CONFIG } from "./config.js";

export function initHeroAnimation(options) {
  const root = options.root;
  const canvas = options.canvas;
  const viewportElement = options.viewportElement;
  const scrollElement = options.scrollElement || document.documentElement;
  let theme = options.theme || (window.getEffectiveTheme ? window.getEffectiveTheme() : "dark");
  let userConfig = options.config || {};
  let resolvedConfig = resolveHeroAnimationConfig(userConfig, {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    viewportWidth: viewportElement.clientWidth || window.innerWidth,
    viewportHeight: viewportElement.clientHeight || window.innerHeight,
    theme: theme
  });
  let renderer = createHeroRenderer({
    root: root,
    canvas: canvas,
    viewportElement: viewportElement,
    scrollElement: scrollElement,
    config: resolvedConfig,
    theme: theme
  });

  renderer.start();

  return {
    destroy() {
      renderer.destroy();
    },
    refreshLayout() {
      resolvedConfig = resolveHeroAnimationConfig(userConfig, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        viewportWidth: viewportElement.clientWidth || window.innerWidth,
        viewportHeight: viewportElement.clientHeight || window.innerHeight,
        theme: theme
      });
      renderer.updateConfig(resolvedConfig);
    },
    updateConfig(partialConfig) {
      userConfig = {
        ...userConfig,
        ...(partialConfig || {})
      };
      resolvedConfig = resolveHeroAnimationConfig(userConfig, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        viewportWidth: viewportElement.clientWidth || window.innerWidth,
        viewportHeight: viewportElement.clientHeight || window.innerHeight,
        theme: theme
      });
      renderer.updateConfig(resolvedConfig);
    },
    updateTheme(nextTheme) {
      theme = nextTheme;
      const nextPalette = getPaletteForTheme(nextTheme, userConfig);
      resolvedConfig = resolveHeroAnimationConfig({
        ...userConfig,
        colorPalette: nextPalette
      }, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        viewportWidth: viewportElement.clientWidth || window.innerWidth,
        viewportHeight: viewportElement.clientHeight || window.innerHeight,
        theme: nextTheme
      });
      renderer.updateTheme(nextTheme, resolvedConfig);
    }
  };
}

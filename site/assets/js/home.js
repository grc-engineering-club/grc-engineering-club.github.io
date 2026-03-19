import { initHeroAnimation } from "./hero-animation/index.js";

let heroController = null;
let themeObserver = null;
let pageLifecycleController = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initRevealSystem() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  const staggerGroups = Array.from(document.querySelectorAll("[data-reveal-stagger]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  staggerGroups.forEach(function (group) {
    Array.from(group.children).forEach(function (child, index) {
      if (child.matches("[data-reveal]")) {
        child.style.setProperty("--reveal-index", String(index));
      }
    });
  });

  if (reducedMotion) {
    items.forEach(function (item) {
      item.classList.add("is-visible");
    });

    return {
      destroy() {}
    };
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -12% 0px"
  });

  items.forEach(function (item) {
    observer.observe(item);
  });

  return {
    destroy() {
      observer.disconnect();
    }
  };
}

function initStoryProgress() {
  const progressRoot = document.querySelector(".story-progress");
  const progressFill = progressRoot ? progressRoot.querySelector(".story-progress-fill") : null;
  const stepElements = progressRoot
    ? Array.from(progressRoot.querySelectorAll("[data-story-step]"))
    : [];
  const sectionDefinitions = [
    { key: "hero", element: document.querySelector('[data-story-section="hero"]') },
    { key: "browse", element: document.querySelector('[data-story-section="browse"]') },
    { key: "directory", element: document.querySelector('[data-story-section="directory"]') },
    { key: "insights", element: document.querySelector('[data-story-section="insights"]') },
    { key: "footer", element: document.querySelector(".footer") }
  ].filter(function (definition) {
    return Boolean(definition.element);
  });
  let frameId = 0;
  let progressRevealFrame = 0;

  if (!progressRoot || sectionDefinitions.length < 2) {
    return {
      destroy() {}
    };
  }

  function setProgressVisibility(isVisible) {
    if (!progressRoot) return;

    if (!isVisible) {
      if (progressRevealFrame) {
        window.cancelAnimationFrame(progressRevealFrame);
        progressRevealFrame = 0;
      }

      progressRoot.classList.remove("is-visible");
      progressRoot.hidden = true;
      return;
    }

    if (!progressRoot.hidden) {
      progressRoot.classList.add("is-visible");
      return;
    }

    progressRoot.hidden = false;

    progressRevealFrame = window.requestAnimationFrame(function () {
      progressRevealFrame = 0;
      progressRoot.classList.add("is-visible");
    });
  }

  function update() {
    frameId = 0;
    const anchor = window.scrollY + window.innerHeight * 0.42;
    let activeIndex = 0;

    for (let index = 0; index < sectionDefinitions.length; index += 1) {
      const definition = sectionDefinitions[index];
      const rect = definition.element.getBoundingClientRect();
      const top = window.scrollY + rect.top;

      if (anchor >= top) {
        activeIndex = index;
      } else {
        break;
      }
    }

    const current = sectionDefinitions[activeIndex];
    const next = sectionDefinitions[Math.min(activeIndex + 1, sectionDefinitions.length - 1)];
    let segmentProgress = 1;

    if (next && next !== current) {
      const currentTop = window.scrollY + current.element.getBoundingClientRect().top;
      const nextTop = window.scrollY + next.element.getBoundingClientRect().top;
      const range = Math.max(nextTop - currentTop, 1);

      segmentProgress = clamp((anchor - currentTop) / range, 0, 1);
    }

    const totalSteps = Math.max(sectionDefinitions.length - 1, 1);
    const storyProgress = clamp((activeIndex + segmentProgress) / totalSteps, 0, 1);

    document.body.dataset.storySection = current.key;
    document.documentElement.style.setProperty("--story-progress-ratio", storyProgress.toFixed(4));

    if (progressRoot) {
      const showProgress = current.key !== "hero" && current.key !== "footer";
      setProgressVisibility(showProgress);
    }

    if (progressFill) {
      progressFill.style.transform = "scaleY(" + storyProgress.toFixed(4) + ")";
    }

    stepElements.forEach(function (stepElement, index) {
      const isActive = index === activeIndex;
      const isComplete = index < activeIndex;

      stepElement.classList.toggle("is-active", isActive);
      stepElement.classList.toggle("is-complete", isComplete);
    });

    sectionDefinitions.forEach(function (definition, index) {
      definition.element.classList.toggle("is-story-active", index === activeIndex);
      definition.element.classList.toggle("is-story-past", index < activeIndex);
    });
  }

  function queueUpdate() {
    if (!frameId) {
      frameId = window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  queueUpdate();

  return {
    destroy() {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      if (progressRevealFrame) {
        window.cancelAnimationFrame(progressRevealFrame);
      }
    }
  };
}

function initHomePage() {
  const root = document.getElementById("hero");
  const canvas = document.getElementById("hero-canvas");
  const viewportElement = document.querySelector(".page-visual-stage");
  const scrollElement = document.documentElement;
  const interactionElement = document.body;

  if (!root || !canvas || !viewportElement) return;

  document.body.classList.add("motion-ready");

  heroController = initHeroAnimation({
    root: root,
    canvas: canvas,
    viewportElement: viewportElement,
    scrollElement: scrollElement,
    interactionElement: interactionElement
  });

  const revealController = initRevealSystem();
  const storyController = initStoryProgress();

  pageLifecycleController = {
    destroy() {
      revealController.destroy();
      storyController.destroy();
    }
  };

  themeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === "data-theme" && heroController) {
        heroController.updateTheme(window.getEffectiveTheme ? window.getEffectiveTheme() : "dark");
      }
    });
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  window.addEventListener("pagehide", function () {
    document.body.classList.remove("motion-ready");
    if (themeObserver) themeObserver.disconnect();
    if (pageLifecycleController) pageLifecycleController.destroy();
    if (heroController) heroController.destroy();
    themeObserver = null;
    pageLifecycleController = null;
    heroController = null;
  }, { once: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHomePage);
} else {
  initHomePage();
}

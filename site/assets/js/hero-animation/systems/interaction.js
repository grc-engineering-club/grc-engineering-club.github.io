export function createInteractionController(root, viewportElement, strength) {
  const state = {
    targetX: 0.5,
    targetY: 0.5,
    currentX: 0.5,
    currentY: 0.5,
    targetActive: 0,
    currentActive: 0,
    strength: strength,
    bounds: null,
    enabled: true
  };

  function updateBounds() {
    state.bounds = viewportElement.getBoundingClientRect();
  }

  function updateFromPointer(clientX, clientY) {
    if (!state.enabled) return;
    if (!state.bounds) updateBounds();
    if (!state.bounds || !state.bounds.width || !state.bounds.height) return;

    state.targetX = (clientX - state.bounds.left) / state.bounds.width;
    state.targetY = (clientY - state.bounds.top) / state.bounds.height;
    state.targetActive = 0.08;
  }

  function handlePointerMove(event) {
    updateFromPointer(event.clientX, event.clientY);
  }

  function handlePointerLeave() {
    state.targetActive = 0;
    state.targetX = 0.5;
    state.targetY = 0.5;
  }

  root.addEventListener("pointermove", handlePointerMove, { passive: true });
  root.addEventListener("pointerleave", handlePointerLeave);
  document.addEventListener("visibilitychange", handlePointerLeave);

  updateBounds();

  return {
    getState() {
      return {
        x: state.currentX,
        y: state.currentY,
        active: state.currentActive,
        strength: state.strength
      };
    },
    refreshBounds: updateBounds,
    setStrength(nextStrength) {
      state.strength = nextStrength;
    },
    setEnabled(nextEnabled) {
      state.enabled = Boolean(nextEnabled);

      if (!state.enabled) {
        handlePointerLeave();
      }
    },
    tick(deltaTime) {
      const easing = 1 - Math.exp(-deltaTime * 2.25);
      const activeEasing = 1 - Math.exp(-deltaTime * 2.3);

      state.currentX += (state.targetX - state.currentX) * easing;
      state.currentY += (state.targetY - state.currentY) * easing;
      state.currentActive += (state.targetActive - state.currentActive) * activeEasing;
    },
    destroy() {
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handlePointerLeave);
    }
  };
}

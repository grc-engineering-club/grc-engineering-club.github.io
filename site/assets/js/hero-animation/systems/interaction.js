export function createInteractionController() {
  return {
    getState: function () {
      return { x: 0.5, y: 0.5, active: 0, strength: 0 };
    },
    refreshBounds: function () {},
    setStrength: function () {},
    setEnabled: function () {},
    tick: function () {},
    destroy: function () {}
  };
}

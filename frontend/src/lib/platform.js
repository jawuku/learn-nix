// The modifier key used for shortcuts on this platform (⌘ on macOS, Ctrl
// elsewhere). Shared by the sidebar trigger and the command palette footer so
// the platform detection lives in one place.
export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl";

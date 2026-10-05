/** While the rolling list is up, every key returns to Ready and does not start the test. */
export function readyKeyDown(key: string, rolling: boolean): "wake" | "ignore" | "start" {
  if (rolling) {
    return "wake";
  }
  if (key === "Escape") {
    return "ignore";
  }
  return "start";
}

/** A tap on Ready starts the test. The logo badge is for the operator's long-press only. */
export function readyPointerUp(pointer: { button: number; onLogo: boolean }): "start" | "ignore" {
  if (pointer.button !== 0 || pointer.onLogo) {
    return "ignore";
  }
  return "start";
}

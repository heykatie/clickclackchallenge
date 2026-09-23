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

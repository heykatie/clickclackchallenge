export function isViewLeaderboardKey(key: { key: string; code?: string }): boolean {
  return (
    key.key === "Enter" ||
    key.key === "NumpadEnter" ||
    key.key === " " ||
    key.code === "Enter" ||
    key.code === "NumpadEnter" ||
    key.code === "Space"
  );
}

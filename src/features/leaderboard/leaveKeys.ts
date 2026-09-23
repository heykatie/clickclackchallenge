export function isLeaderboardLeaveKey(key: { key: string; code?: string }): boolean {
  return (
    key.key === "Escape" ||
    key.key === "Enter" ||
    key.key === "NumpadEnter" ||
    key.key === " " ||
    key.code === "Enter" ||
    key.code === "NumpadEnter" ||
    key.code === "Space"
  );
}

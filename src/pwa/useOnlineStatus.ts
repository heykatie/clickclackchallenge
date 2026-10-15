import { useEffect, useState } from "react";

/**
 * Whether the browser reports a network connection, kept current as it changes. The booth works offline either way;
 * this only tells staff, for things like the update banner or a hosted analysis that needs the network.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

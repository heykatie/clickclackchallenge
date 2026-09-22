import { useEffect, useRef } from "react";

type ReadyScreenProps = {
  onStart: () => void;
};

export function ReadyScreen({ onStart }: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onStart]);

  return (
    <main className="screen" ref={screenRef} tabIndex={-1}>
      <p className="display">PRESS ANY KEY TO START</p>
    </main>
  );
}

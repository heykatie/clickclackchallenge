const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type UpdateCheckEnvironment = {
  window: Pick<Window, "addEventListener" | "removeEventListener" | "setInterval" | "clearInterval">;
  document: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
  navigator: Pick<Navigator, "onLine">;
};

/** Check for waiting app updates on launch, resume, focus, and periodically while the app is visible. */
export function watchForServiceWorkerUpdates(
  registration: Pick<ServiceWorkerRegistration, "update">,
  environment: UpdateCheckEnvironment = { window, document, navigator },
) {
  const check = () => {
    if (environment.document.visibilityState !== "visible" || !environment.navigator.onLine) {
      return;
    }
    void registration.update().catch(() => {
      // An offline or transient update check should not interrupt the booth.
    });
  };

  environment.window.addEventListener("focus", check);
  environment.document.addEventListener("visibilitychange", check);
  const interval = environment.window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  check();

  return () => {
    environment.window.removeEventListener("focus", check);
    environment.document.removeEventListener("visibilitychange", check);
    environment.window.clearInterval(interval);
  };
}

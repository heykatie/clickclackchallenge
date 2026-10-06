/** A bar along the bottom of a button that drains over `seconds`, so a timed exit never feels abrupt. */
export function ButtonCountdown({ seconds }: { seconds: number }) {
  return <span className="button-countdown" aria-hidden="true" style={{ animationDuration: `${seconds}s` }} />;
}

import { Children, type ReactNode } from "react";

/**
 * Heading text with one accent word. The Magnum look colours that word. Other looks leave it alone.
 * The accent is the last word unless `on` names another.
 */
export function Hd({ children, on }: { children: ReactNode; on?: string }) {
  const text = Children.toArray(children).join("");
  const at = on ? text.toLowerCase().indexOf(on.toLowerCase()) : -1;
  if (on && at >= 0) {
    return <>{text.slice(0, at)}<em>{text.slice(at, at + on.length)}</em>{text.slice(at + on.length)}</>;
  }
  const m = text.match(/^(.*\s)?(\S+)$/s);
  return m ? <>{m[1] ?? ""}<em>{m[2]}</em></> : <>{text}</>;
}

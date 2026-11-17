// Small helpers every pack and screen can use. Nothing here belongs to a client.

/** Site assets resolve against the build's base path. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

/** On-screen text never shows an em dash, whatever the source text holds. */
export function clean(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/–/g, "-");
}

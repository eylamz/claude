/**
 * Allow importing .css files (side-effect imports for Next.js/bundler).
 * Fixes "Cannot find module '*.css' or its corresponding type declarations" when using tsc --noEmit.
 */
declare module '*.css' {
  const content: Record<string, string> | undefined;
  export default content;
}

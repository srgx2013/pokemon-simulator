// Ambient declarations for template CSS-module imports (e.g. `global.css`,
// `animated-icon.module.css`). Mirrors what Expo's generated `expo-env.d.ts`
// would provide; standalone `tsc -p apps/mobile` stays deterministic without
// the gitignored generated file.
declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
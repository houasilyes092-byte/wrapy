/**
 * Netlify context of the build ("production", "deploy-preview", "branch-deploy", ...),
 * inlined from CONTEXT at build time by next.config.ts. Netlify does not expose
 * CONTEXT to the runtime, so reading it directly would always be empty there.
 */
const buildContext = process.env.NETLIFY_BUILD_CONTEXT;

/**
 * True for Netlify deploy previews and branch deploys. Those builds receive
 * production-scoped secrets, so integrations that touch production data
 * (database, session signing, storage, Google sign-in) are disabled there.
 */
export const isNonProductionNetlifyContext =
  buildContext === "deploy-preview" || buildContext === "branch-deploy";

export const isProductionNetlifyContext = buildContext === "production";

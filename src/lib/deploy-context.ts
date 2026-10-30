/**
 * True for Netlify deploy previews and branch deploys. Those builds receive
 * production-scoped secrets, so integrations that touch production data
 * (database, session signing, storage, Google sign-in) are disabled there.
 */
export const isNonProductionNetlifyContext =
  process.env.CONTEXT === "deploy-preview" || process.env.CONTEXT === "branch-deploy";

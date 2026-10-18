import { createRemoteJWKSet, jwtVerify } from "jose";
export const READ_SCOPE = "music.tasks:read";
export function httpsUrl(value, label) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(`${label} must be a clean HTTPS URL`);
  return url;
}
export function createVerifier({
  issuer,
  audience,
  jwksUrl,
  keyResolver,
  requiredScope = READ_SCOPE,
}) {
  httpsUrl(issuer, "issuer");
  httpsUrl(audience, "audience");
  const key = keyResolver ?? createRemoteJWKSet(httpsUrl(jwksUrl, "JWKS URL"));
  return async function verify(header) {
    if (!header?.startsWith("Bearer ") || header.length > 16384)
      throw new Error("invalid token");
    const token = header.slice(7);
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat", "jti"],
    });
    // Tokens must be short lived. Revocation before expiry remains an issuer dependency.
    if (
      !Number.isFinite(payload.iat) ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 300 ||
      payload.iat > Date.now() / 1000 + 30
    )
      throw new Error("invalid lifetime");
    if (typeof payload.jti !== "string" || !payload.jti)
      throw new Error("missing revocation identifier");
    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      typeof payload.tenant_id !== "string" ||
      !payload.tenant_id
    )
      throw new Error("missing identity");
    const scopes =
      typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (!scopes.includes(requiredScope)) {
      const e = new Error("insufficient scope");
      e.status = 403;
      throw e;
    }
    return Object.freeze({
      subject: payload.sub,
      tenant: payload.tenant_id,
      jti: payload.jti,
    });
  };
}

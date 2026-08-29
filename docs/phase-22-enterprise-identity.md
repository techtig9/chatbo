# Phase 22 — Enterprise Identity

This phase adds the enterprise identity foundation for Chatbo.

## Included

- Verified organization domains
- SSO configuration storage for SAML 2.0 and OIDC
- SSO discovery endpoint by email domain
- SCIM 2.0 bearer-token provisioning endpoints
- SCIM user create/list/read/update/delete lifecycle
- Organization security settings
- MFA enforcement policy flag
- SSO enforcement policy flag
- Verified-domain restriction flag
- IP allowlist storage
- Session timeout policy
- Security-event storage
- Secure, hashed SCIM tokens
- Enterprise security dashboard

## SCIM endpoint

`/api/enterprise/scim/v2/Users`

Use `Authorization: Bearer <SCIM token>`.

The raw SCIM token is shown only once when created. The database stores only a SHA-256 hash.

## SSO discovery

`GET /api/enterprise/sso/discovery?email=user@company.com`

The endpoint returns enabled SSO providers for a verified organization domain. This is intentionally a discovery/configuration layer; the actual SAML/OIDC protocol exchange should be connected to the chosen identity-provider library before enabling production SSO enforcement.

## Security principle

SCIM tokens and SSO client secrets/certificates must never be exposed to normal workspace members. Production secret encryption should use the same server-side integration-encryption mechanism already used elsewhere in Chatbo.

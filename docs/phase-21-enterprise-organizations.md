# Phase 21 — Enterprise Organizations, Teams & RBAC

Phase 21 adds an organization layer above workspaces, organization-level roles, teams, team membership, enterprise permissions and an organization administration UI. Existing workspaces are backfilled into organizations so the current product model continues to work.

## Roles
owner, admin, security_admin, billing_admin, developer, analyst, member, viewer.

## Teams
Organizations can create departments/specialist teams and later assign agents, workflows and knowledge resources to teams.

## Security
Organization and team tables use RLS. Existing workspace RBAC remains the runtime authorization boundary; organization permissions are the enterprise policy layer.

## Next expansion
SSO/SAML, SCIM provisioning, IP allowlists, enterprise audit exports, team-scoped resources and organization-wide security policies.

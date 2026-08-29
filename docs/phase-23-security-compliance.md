# Phase 23 — Enterprise Security Center & Compliance

Phase 23 adds organization-wide security visibility and compliance foundations.

## Added
- Security Center dashboard with security score and control coverage.
- Organization-wide audit event table.
- Append-only server-side organization audit event infrastructure.
- Security event recording helper.
- Compliance settings table for audit/data retention and export/deletion controls.
- Security events API for authorized audit readers.
- Navigation entry for Security Center.

## Security model
Security-sensitive organization events are written server-side. Organization audit and compliance reads are restricted to owner, admin and security_admin members by RLS.

## Important compliance note
These features provide technical controls and evidence foundations. They do not by themselves make Chatbo SOC 2, ISO 27001 or GDPR certified/compliant; legal, operational and independent audit requirements still apply.

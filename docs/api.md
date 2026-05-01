# API Reference

Base URL: `https://api-cf-workers.<your-subdomain>.workers.dev`

---

## Table of contents

- [Authentication](#authentication)
- [Common response fields](#common-response-fields)
- **Health**
  - [`GET /health`](#get-health)
- **Example**
  - [`GET /example`](#get-example)

---

## Authentication

All endpoints except `GET /health` require a valid JWT Bearer token in the `Authorization` header.

```
Authorization: Bearer <token>
```

The token must be RS256-signed by your auth server. The worker reads the `email` claim to identify the user and the `roles` array to authorize privileged endpoints.

**Token payload shape:**

```json
{
  "sub": "user-cuid",
  "email": "alice@example.com",
  "roles": ["superadmin"],
  "iat": 1777372236,
  "exp": 1777977036
}
```

**Error responses for authentication failures:**

| Status | Meaning |
|--------|---------|
| `401` | Missing, malformed, expired, or invalid-signature token |
| `403` | Valid token but insufficient role |

---

## Common response fields

**Error object:**

```json
{ "error": "Human-readable error message" }
```

---

## Health

### `GET /health`

Returns the worker status. No authentication required.

**Response `200`**

```json
{ "status": "ok", "timestamp": "2024-01-15T09:00:00.000Z" }
```

---

## Example

### `GET /example`

Returns the authenticated user's profile decoded from the JWT. Requires a valid Bearer token.

**Response `200`**

```json
{
  "user": {
    "sub": "user-cuid",
    "email": "alice@example.com",
    "roles": ["superadmin"],
    "org_unit": "engineering",
    "department": "platform",
    "manager_cuid": null,
    "iat": 1777372236,
    "exp": 1777977036
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| `401` | Missing, expired, or invalid token |

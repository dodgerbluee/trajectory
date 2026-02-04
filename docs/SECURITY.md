# Security policy

## Authentication & CSRF Risk

Trajectory uses header-based JWT authentication and does not rely on cookies for authentication. As a result, traditional CSRF attacks do not apply. If cookie-based authentication is added in the future, CSRF protection will be required.

## HTTPS Deployment Expectation

Trajectory assumes it is deployed behind an HTTPS-terminating reverse proxy (e.g., nginx, Caddy, cloud load balancer). All traffic to the application should be encrypted in transit.

## Encryption at Rest & Storage Expectations

Trajectory does **not** encrypt data at rest by default. Operators and users handling sensitive data **must** enable disk or volume encryption on the host system. Recommended approaches include:

- Full disk encryption (e.g., LUKS)
- ZFS native encryption
- Encrypted VM disks (cloud or hypervisor)
- Encrypted Docker volumes

Backups should be encrypted using tools such as **restic** or **borg**. See deployment documentation for backup/restore details.

### Security Practices

- **Passwords:** Argon2 or bcrypt for password hashing
- **HTTPS only:** All traffic must be served over HTTPS
- **Secure cookie flags:** All cookies must be set with Secure, HttpOnly, and SameSite attributes
- **CSRF protection:** All forms and API endpoints must implement CSRF protection
- **Auth boundaries:** Proper authorization boundaries between children, families, and accounts
- **Encrypted backends (optional):** Support for encrypted storage backends (ZFS, encrypted Docker volumes, encrypted backups)

#### Example: Encrypted Backends

- ZFS encryption for database and uploads volumes
- Encrypted Docker volumes for all persistent data
- Encrypted backups using restic, borg, or similar

#### Operator Guidance

Operators are responsible for ensuring that:

- Host disks/volumes are encrypted if handling sensitive data
- Backups are encrypted and stored securely
- HTTPS is enforced at all entry points
- Application is deployed with secure cookie and CSRF settings

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

- **Preferred:** In this repository, go to **Security** → **Advisories** → **Report a vulnerability** (private).
- **Alternative:** Email the maintainers (see repo description or README for contact). Encrypt if possible (e.g. GPG).

Include:

- Type of issue (e.g. auth bypass, IDOR, XSS) and affected component.
- Steps to reproduce and impact.
- Suggested fix or mitigation, if you have one (optional).

## Responsible disclosure

- We will acknowledge your report within **7 days** and aim to give an initial assessment within **14 days**.
- We will work with you on a fix and keep you updated. We aim to patch critical issues within **90 days** where feasible.
- We will credit you in the advisory/release notes (unless you prefer to stay anonymous).
- We ask that you **do not disclose the vulnerability publicly** until a fix is released or we agree on a disclosure date. We suggest **90 days** from report as a reasonable window before public disclosure if no fix is available.

Thank you for helping keep Trajectory and its users safe.

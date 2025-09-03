
# Security Policy

## Supported versions

We maintain security fixes for the currently released builds of Numeric Clock:

| Extension branch | GNOME Shell | Version line | Status              |
| ---------------- | ----------- | ------------ | ------------------- |
| `main`           | 45+         | **1.2.x**    | Actively supported  |
| `legacy/42-44`   | 42–44       | **1.1.x**    | Critical fixes only |

If you’re on an older line, please upgrade to a supported version.

## Reporting a vulnerability

**Please do not open a public issue.**
Use one of these private channels:

1. **GitHub → Security → “Report a vulnerability”** (preferred).
   This creates a private advisory thread with maintainers.
2. **Email:** `nickotmazgin.dev@gmail.com`

Include, if possible:

* A clear description and impact
* Steps to reproduce
* Affected GNOME Shell version(s) and OS
* Relevant logs (e.g. `journalctl --user -b 0 -o cat | grep -i numeric-clock`)
* Whether the issue also affects the legacy 42–44 build

## Response & disclosure timeline

* **Acknowledgement:** within **48 hours**
* **Triage & initial assessment:** within **7 days**
* **Fix, mitigation, or plan:** within **30 days** for supported lines

We coordinate a disclosure date with you. Once a fix is released, we’ll publish a GitHub Security Advisory and, if appropriate, request a **CVE** through GitHub.

Reporters will be credited in release notes unless you request otherwise.

## Scope

This policy covers the Numeric Clock extension code and release packages in this repository and on GNOME Extensions. It **does not** cover vulnerabilities in GNOME Shell itself, other extensions, or your distribution packages.

## Safe-harbor

We will not pursue legal action against good-faith research and reporting that:

* Avoids privacy violations and data destruction,
* Does not degrade other users’ experience, and
* Respects coordinated disclosure.

If in doubt, contact us first.

---

* ➕ **CODEOWNERS**

  ```
  * @nickotmazgin
  ```

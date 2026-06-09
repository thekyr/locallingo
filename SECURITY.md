# Security Policy

## Supported Versions

Only the latest released version of LocalLingo receives security updates.
Please make sure you are running the most recent version before reporting an
issue.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately through **GitHub Security Advisories**: open a
report via the
[Security tab](https://github.com/thekyr/locallingo/security/advisories/new)
of this repository.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- The affected version and your Firefox version
- Any suggested remediation, if you have one

You can expect an acknowledgement within **7 days**. Once the issue is
confirmed, a fix will be prepared and released, and you will be credited in the
release notes unless you prefer to remain anonymous.

## Scope

LocalLingo is a browser extension that translates text using a **local** AI
model. It is designed so that page content never leaves your machine — it is
only sent to a model server you run yourself (e.g. `http://localhost:11434`).

Examples of issues in scope:

- Cross-site scripting (XSS) or DOM injection in the extension's UI or in the
  way translated content is inserted into pages
- Unintended exfiltration of page content or settings to any host other than
  the user-configured local server
- Privilege escalation or abuse of the extension's permissions
  (`activeTab`, `storage`, `contextMenus`, `http://localhost/*`)

Out of scope:

- Vulnerabilities in the local model server (Ollama, LM Studio, etc.) itself
- Issues that require a malicious model server the user has explicitly
  configured
- Social-engineering or physical-access attacks

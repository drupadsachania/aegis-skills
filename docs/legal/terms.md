# Terms of Service

Version 1.1. Last updated: 2026-10-13.

These terms cover your use of the Aegis and Themis website at <https://aegis-skills.vercel.app/> and the hosted Aegis MCP server at <https://aegis-skills.vercel.app/api/mcp>. They are written in plain English on purpose. They are not a substitute for legal advice, and they should be read together with the [privacy policy](/docs/themis/privacy-policy), the [security policy](/security) and the [licence](/license). Aegis and Themis are published by the Kairos Foundation.

By using the website or the hosted MCP server you agree to these terms. If you do not agree, please do not use them.

## 1. What this service is

- **The website** is a read-only library. It serves the Aegis skills as pages, downloads (single-file prompts and zip files) and documentation. It is built from the public repository at <https://github.com/drupadsachania/aegis-skills>.
- **The hosted MCP server** is a read-only endpoint with three tools, `list_skills`, `get_skill` and `get_skill_phase`. It returns public skill text that is also on the website.
- **There are no accounts.** You do not sign in, and we hold no profile about you.
- **There are no model calls.** The website and the hosted MCP server never send your data to an AI model. The only model that sees anything is the one you choose to paste a skill into or connect the server to.
- **We store no user data.** The hosted MCP server keeps no record of your requests. It holds a short-lived request counter in memory to limit bursts, and nothing is written to disk or logged by our code. The website sets no cookies and runs no analytics. What runs where, and how you can check it yourself, is written out in [Trust and data flow](/trust).

Themis, the local agent, runs on your own machine. It is still being matured and is not published to package registries or AI directories yet. These terms cover the website and the hosted MCP server; the software you run yourself is governed by its licence (section 2).

## 2. Open-source licences

The code and the skill content in the repository are licensed under Apache-2.0 OR MIT, at your option. The copyright holder is the Kairos Foundation. The full texts are on the [licence page](/license). Where these terms and the licences differ about what you may do with the code or skill content, the licences win.

The names and logos of Aegis, Themis and the Kairos Foundation are not licensed for use as your own brand or in a way that suggests we endorse you.

## 3. Authorised, lawful, defensive use only

Aegis is security guidance, and security guidance is dual-use: knowledge that helps a defender can also help an attacker. You may use the skills and the hosted MCP server only for lawful, defensive purposes, and only on systems, networks, data and accounts that you own or are explicitly authorised to assess.

You are responsible for having that authorisation, in writing where it matters, before you test, scan, validate or otherwise act on anything. You must not use the service or the skills against any system you do not own or are not authorised to test, to harm or harass anyone, to break the law, or to get around the controls of a service you do not control. Each skill states its own scope and authorisation requirements. Please read them.

We may block access to the hosted MCP server for anyone who abuses it.

## 4. No warranty

The service and everything on it is provided "as is" and "as available", without warranty of any kind, whether express or implied, including any warranty of merchantability, fitness for a particular purpose, accuracy, completeness or non-infringement. Skills are guidance written by people and tools. They can be incomplete, out of date or wrong for your situation. Check them before you rely on them, especially before you act on a production system. Nothing here is legal, compliance or professional advice, and nothing is a certification.

## 5. Limitation of liability

To the fullest extent permitted by law, the Kairos Foundation and the contributors are not liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, data, use or goodwill, arising out of or in connection with your use of, or inability to use, the service or the skills, even if we were told such loss was possible. Where the law does not allow a limit to apply, it applies only as far as the law permits. Nothing in these terms limits liability that cannot be limited by law.

## 6. Availability and fair use

We do not guarantee that the website or the hosted MCP server will be available, uninterrupted or error-free, and we may change or stop either at any time. To keep the hosted MCP server usable for everyone, it limits each IP address to 120 requests a minute on a best-effort basis, rejects request bodies over 64 KB, and answers with an error when you go over. Please do not try to get around these limits. If you need heavy or guaranteed use, run the skills locally from the repository, which needs no hosted service at all.

## 7. Third-party services

Some things sit outside our control:

- **Adobe Fonts.** The site loads web fonts from Adobe Fonts. Adobe can see your IP address and browser details when it serves them. The [privacy policy](/docs/themis/privacy-policy) says what is sent.
- **Your own AI provider.** If you paste a skill into a chat AI, connect the hosted MCP server to an AI client, or run Themis with a model of your choice, that provider's terms and privacy practices apply to what you send it. We do not control it and are not responsible for it.
- **Our hosting platform** keeps its own standard request logs under its own rules.
- **Links.** Links to GitHub, the Kairos Foundation and other sites are provided for convenience. We do not control those sites.

## 8. Changes to these terms

We may update these terms. A change takes effect when we publish a new version on this page, with a new version number and a new "Last updated" date at the top. Earlier versions stay available in the repository history. If you keep using the service after a new version is published, you accept it.

## 9. Governing law

<!-- USER: governing law and jurisdiction -->
Governing law will be stated here once the Kairos Foundation's jurisdiction is confirmed.

## 10. Contact

For questions about these terms or the service, write to [support@kairos-foundation.org](mailto:support@kairos-foundation.org). For privacy questions, write to [privacy@kairos-foundation.org](mailto:privacy@kairos-foundation.org). For a security vulnerability, do not use email: use GitHub private vulnerability reporting at <https://github.com/drupadsachania/aegis-skills/security/advisories/new>.

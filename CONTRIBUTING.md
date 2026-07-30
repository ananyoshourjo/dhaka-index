# Contributing

Thank you for helping improve Dhaka Index.

## Before opening a pull request

1. Open or reference an issue for substantial changes.
2. Keep user data, database files, logs, generated PDFs, and secrets out of the
   repository.
3. Do not add crawlers, scraping adapters, login automation, CAPTCHA bypasses,
   or copied job descriptions.
4. Add or update deterministic tests.
5. Run `npm run verify`.

## Job-data corrections

The public repository does not accept crawler implementations. Use the data
correction issue form for an incorrect title, company, deadline, URL, or
removal request. Include the canonical publisher page as evidence.

## Code style

- Use TypeScript with strict typing.
- Preserve the hosted-data privacy model and the public/private crawler boundary.
- Keep network destinations configured by the operator, never supplied by an
  untrusted request.
- Maintain keyboard access, visible focus, semantic HTML, and readable error
  states.

By submitting a contribution, you agree that it is licensed under
Apache-2.0 as described in the repository license.

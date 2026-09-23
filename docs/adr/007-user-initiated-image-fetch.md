# ADR 007 — User-initiated image fetch for a job's logo

Date: 2026-09-14. Status: accepted and implemented (2026-09-14).

## Context

A job can carry a company logo, chosen on the paste form either as an uploaded image or as an image address copied from the company's site. SECURITY.md and document 03 promised that, with no model provider configured, the web service makes no outbound requests, and document 06 set the rules any external fetch must follow before Phase 2 enables posting import. Showing a pasted address directly in an `<img>` would keep the promise about the server but make the browser load the image from another site on every visit to the Jobs list, telling that site which postings the person tracks.

## Decision

The server fetches a pasted image address once, when the form is saved, and stores the bytes with the job exactly as an upload is stored. The interface then loads every logo from its own origin. This is the one outbound call the service makes besides the configured provider, and it happens only because the person pasted an address.

The fetcher (`src/infrastructure/fetch/fetch-image.ts`) enforces the document 06 rules:

- https only; a bare word, an http address or an address without a host is refused before any network activity.
- The host is resolved and refused when it is `localhost`, or when any resolved address is loopback, private, link-local, unique-local, carrier-grade NAT, multicast or unspecified, including IPv4-mapped IPv6 forms. A literal address goes through the same classification.
- Redirects are not followed by the runtime; the fetcher reads the `Location` header and applies the same checks to each hop, at most three times.
- Ten seconds for the whole exchange, one megabyte for the body, read as a stream and abandoned past the cap; a declared length past the cap is refused before reading.
- The answer must carry an `image/*` content type, and the bytes are then typed from their magic numbers (PNG, JPEG, WebP) or their root element (SVG) by the Jobs module; anything else is refused whatever the site or the name claimed.

The stored file is served by the application with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox`, so an SVG cannot run script even when opened directly, and with a content hash in its address so it can be cached forever and a stale address answers 404.

## Consequences

- SECURITY.md, document 03 and document 06 name this call; the "no outbound requests" promise now reads "no outbound requests you did not start".
- Node's `fetch` resolves the name again when it connects. A name whose answer changes between the check and the connection could reach a private address for that one request. The window is small, the request is one the person chose, and the reply is treated as bytes to type and store, never as instructions; pinning the resolved address would need a hand-built HTTP client and is deferred until posting import (Phase 2A) reuses the fetcher.
- Every check runs without the network: the fetcher takes its `fetch` and resolver as parameters and the unit tests inject both.
- The address is not kept: only the stored bytes and their type are, so a later visit never contacts the site again. Choosing a logo again re-fetches.


## Ownership update (2026-09-23, ADR 011 follow-up)

The fetch security decision remains in force, but Companies now owns the logo and its metadata. Company forms offer upload/address/remove; company MCP create/update accepts logo_url, with null clearing it. Jobs inherit the linked company's logo and no longer upload or own separate images. New company logo files include a random write UUID and checksum so repeated identical uploads cannot race cleanup; legacy filenames remain readable. Serving moves to `/companies/<id>/logo`; migration preserves existing files. The job-owned details above describe the original implementation.

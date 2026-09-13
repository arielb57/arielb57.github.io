/**
 * The only hand-written text on the site. Everything else is measured from the
 * GitHub API at build time.
 *
 * Edit this file to change the voice of the page — nothing here is generated,
 * and nothing here should claim anything the repositories do not back up.
 */

export const about = {
  /** The GitHub profile has no display name set, so the site supplies one. */
  name: 'Ariel Belhamou',

  eyebrow: 'Paris, France',

  headline: 'I build tools that have to be correct.',

  tagline:
    'Marketplace infrastructure, developer tooling, and automation pipelines. ' +
    'Most of what I write ends up being about the part nobody sees: the schema, the ' +
    'access rules, the test that catches the case you did not think of.',

  sourceUrl: 'https://github.com/arielb57/arielb57.github.io',

  body: `
    <p>
      I am a self-taught developer working mainly on <strong>backend systems and
      developer tooling</strong>. The work I care about tends to sit underneath the
      product: data models, authorisation rules, migration paths, and the tests that
      keep them honest.
    </p>
    <p>
      Most of my time goes to <strong>VYVE</strong>, a marketplace I have been
      building since May 2026 — Postgres with row-level security throughout, an
      escrow payment flow, and the legal and tax structure that has to match it.
      Roughly 340 commits so far. Working on it taught me that the hardest part of a
      marketplace is not the code: it is deciding who is allowed to see what, and
      then proving the database actually enforces it.
    </p>
    <p>
      Alongside it I build smaller, sharper things. <strong>forge</strong> is a
      pipeline that reads six engineering feeds every morning, ranks what it finds by
      cross-source corroboration, and turns the survivors into specifications — then
      refuses to let anything through unless its tests genuinely prove something.
      Some of the repositories on this page came out of it, and each one says so.
    </p>
    <p>
      Everything measurable on this page is read from the GitHub API when the page is
      built, once a day. If a number looks small, it is because it is small.
    </p>
  `,
};

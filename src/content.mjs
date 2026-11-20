/**
 * The only hand-written text on the site. Everything measurable is read from
 * the GitHub API at build time; this file holds the words, the choice of which
 * five repositories to show first, and the thematic grouping of the rest.
 *
 * Nothing here should claim anything the repositories do not back up. Numbers
 * in the prose are the ones that cannot come from the API (a private repo,
 * a benchmark) and each has a source that can be checked.
 */

export const about = {
  /** The GitHub profile has no display name set, so the site supplies one. */
  name: 'Ariel Belhamou',

  /** The one factual line under the name in the hero. VYVE leads: it is the main work. */
  tagline:
    'Paris. I am building VYVE, a marketplace with escrowed payments on Postgres ' +
    'row-level security. Alongside it, small and exact finance tools in Rust, TypeScript and Python.',

  sourceUrl: 'https://github.com/arielb57/arielb57.github.io',

  /**
   * Replaces `{{forge-marked}}` in the body, but only when the build found at
   * least one repository carrying the `forge-built` topic. The sentence points
   * at the provenance pills on the cards; it must not appear on a page that
   * has none to point at.
   */
  forgeMarked:
    ' The repositories it produced carry the <code>forge-built</code> topic, and the' +
    ' cards above say so.',

  body: `
    <p>
      I am a self-taught developer in Paris. Most of this year went into two
      things: the backend of <strong>VYVE</strong>, a marketplace, and
      <strong>forge</strong>, a pipeline that reads the week's engineering news and
      turns it into small tools that actually get finished. Nearly everything public
      on this account came out of the second one. Most of it is about money or
      markets, because that is where a cent off is a bug and &ldquo;close
      enough&rdquo; does not survive an audit.
    </p>
    <p>
      The habit I care about most is that a tool should say what it knows. When the
      exact answer is reachable, I get it, in integers or rationals rather than
      floats, and the README says so. When it is not, the best answer goes on the
      screen next to a bound that is actually proven, so the worst case is in the
      output rather than in someone's head. When the real finding is that the usual
      implementation is wrong, the counterexample ships with the fix. I write the
      Limitations section of each README first. Someone will find them anyway.
    </p>
    <p>
      One example of why I bother. The README of netmin used to say the exact
      solver took 0.1&nbsp;s at 24 parties. My benchmark stopped at 20. The number
      for 24 had never been measured; I had extrapolated it. When I finally ran it,
      it was 151&nbsp;ms on average and 240&nbsp;ms at worst. <a
      href="https://github.com/arielb57/netmin/commit/5bc164f">The correction is in
      the commit history</a> and the README now says what the benchmark prints. That
      is the rule I try to hold everything to: if there is a number, there is a
      script that produces it. It is also why every figure on this page is read from
      the GitHub API when the page is built, not typed in.
    </p>
    <p>
      <a href="#vyve"><strong>VYVE</strong></a> is the main thing, and it has its
      own section at the top of this page because it is private and none of the
      numbers below include it.
    </p>
    <p>
      <a href="https://github.com/arielb57/forge"><strong>forge</strong></a> reads
      seven engineering feeds every morning, ranks what it finds by how many sources
      agree, turns the survivors into specifications, builds them, and then does its
      best to reject its own output. The quality gate counts assertions and checks
      how many of them compare a literal to itself; too many and the build fails. It
      never publishes on its own. Every run ends in a review queue where I read the
      result.{{forge-marked}}
    </p>
    <p>
      <strong>How this was made.</strong> Everything here was written with AI
      assistance. I would rather say that than have someone work it out. The tool
      repositories came out of forge from a specification and were reviewed by me
      before publication; forge itself, this site and VYVE I built directly,
      deciding and correcting as I went. Either way I read all of it before it goes
      public. If I cannot explain a repository, it should not be on here.
    </p>
    <p>
      I apply to university next year. The time until then goes on things that are
      worth showing rather than things that are easy to count. Every number on this
      page is read from the GitHub API once a day; if one looks small, it is because
      it is small.
    </p>
  `,
};

/**
 * VYVE, the main project, shown first and on its own. The repository is
 * private, so nothing here can be read from the API: these figures are typed
 * in by hand and the page says so. Keep them in step with the repository.
 */
export const featured = {
  id: 'vyve',
  name: 'VYVE',
  kicker: 'Main project · private repository',
  summary:
    'A marketplace, built end to end: the database, the payment flow, and the legal ' +
    'and tax structure the payment flow has to match.',
  points: [
    {
      title: 'Row-level security everywhere',
      text:
        'Every table in Postgres carries its own access policy. Who may see what is ' +
        'decided once, in the database, and tested there, rather than hoped for in ' +
        'the application layer.',
    },
    {
      title: 'Escrowed payments',
      text:
        'The buyer’s money is held until the transaction completes, then released to ' +
        'the seller or refunded. The payment flow is the core of the product, not a plug-in.',
    },
    {
      title: 'Legal and tax structure',
      text:
        'The flow of money in the code has to match the flow of money in the contracts ' +
        'and the tax structure. Both are part of the project, not an afterthought.',
    },
  ],
  /** Hand-maintained: the repository is private, so the API cannot supply these. */
  figures: [
    { value: '343', label: 'commits' },
    { value: '273', label: 'test files' },
    { value: 'May 2026', label: 'started' },
  ],
  figuresNote: 'Counted from the private repository by hand, not by the API like the rest of the page.',
  hardPart:
    'The hard part was not the code. It was deciding who is allowed to see what, and ' +
    'then proving the database enforces it rather than hoping the application layer does.',
  access: 'The code is private. I am happy to walk through it on a call or share read access on request.',
};

/**
 * The five repositories to read first, in order. Each entry names the repo and
 * says what to look at. The live numbers (language, commits, last push) are
 * joined from the API at build time, and an entry whose repository is missing
 * from the fetched data is skipped rather than shown with blanks.
 */
export const startHere = {
  intro: 'If you only have a few minutes, these five are the best sample of how I work.',
  repos: [
    {
      name: 'netmin',
      what:
        'Settles a web of payment obligations in the fewest transfers, and either proves ' +
        'the count is minimal or prints the gap. On the six-party example it needs 3 ' +
        'transfers where the usual largest-pays-largest method needs 4.',
      look:
        'Start with tests/oracles.py: a brute-force enumeration of every way to split the ' +
        'parties, which the fast solver has to agree with on hundreds of random cases. ' +
        'Exact up to 24 parties in 151 ms on average, pure Python, no dependencies.',
    },
    {
      name: 'sumtree-audit',
      what:
        'A Merkle sum-tree proof of liabilities, the thing an exchange publishes to show ' +
        'it holds what it owes.',
      look:
        'Read the attack before the proof. It ships with the one that breaks the naive ' +
        'construction, and a proof system you have not seen fail is not one to trust yet.',
    },
    {
      name: 'auctionclear',
      what: 'Uncrosses a call auction under each venue’s tie-break rules.',
      look:
        'The reference implementation in the tests is deliberately slow and deliberately ' +
        'obvious: it tries every price. The fast one has to match it.',
    },
    {
      name: 'panfpe',
      what:
        'NIST FF1 and FF3-1 format-preserving encryption for card tokens, in TypeScript ' +
        'with no dependencies.',
      look:
        'The official test vectors are in the test suite. Crypto you cannot check against ' +
        'a published answer is crypto you have not tested.',
    },
    {
      name: 'peekahead',
      what: 'Finds look-ahead bias in backtest features without reading the code.',
      look:
        'It names the leaking column, how many rows ahead it reads, and how much of the ' +
        'backtest’s Sharpe was the leak. Finding the bug is the easy half; pricing it ' +
        'is what makes someone fix it.',
    },
  ],
};

/**
 * Thematic groups for the Work section, in display order. Membership is a list
 * of repository names; a repository in none of them lands in "Everything else",
 * which the renderer adds last and never hides. A name listed here that the API
 * does not return is simply absent, and a repository listed twice is shown in
 * the first group that names it.
 */
export const groups = [
  {
    id: 'money',
    title: 'Money, to the cent',
    note: 'Exact arithmetic where a rounding error is a bug with a dollar sign on it.',
    repos: [
      'centdrift', 'centflip', 'en16931-totals', 'tiercliff', 'stubfrac', 'tipsratio',
      'lotsnap', 'achclock', 'liqbracket', 'streamfall', 'lmsr-exact', 'netmin',
      'sca-exempt', 'digitblind',
    ],
  },
  {
    id: 'markets',
    title: 'Markets and microstructure',
    note: 'Order books, auctions, filings and backtests, checked against brute force where one exists.',
    repos: [
      'itchbook', 'matchlaw', 'auctionclear', 'fixgap', 'queuebound', 'tickpack',
      'markout-fdr', 'volarb', 'ddbreach', 'warmupbound', 'shortswing', 'thirteenf-delta',
      'irroots', 'cla-exact', 'exactcoverage',
    ],
  },
  {
    id: 'models',
    title: 'Backtests and models that lie',
    note: 'Tools that measure how much of a result was the method and how much was the leak.',
    repos: ['peekahead', 'manytrials', 'exactscale', 'codecollapse', 'knockwire'],
  },
  {
    id: 'security',
    title: 'Security, privacy, forensics',
    note: 'Proofs shipped with the attack that breaks them, and audits of what a program can reach.',
    repos: ['sumtree-audit', 'panfpe', 'hostsplit', 'xselaudit', 'elfcaps', 'homophone', 'jpegpast'],
  },
  {
    id: 'builds',
    title: 'Builds and static analysis',
    note: 'What a build would gain if one thing were faster, proven rather than profiled.',
    repos: ['buildcrit', 'includecost', 'mqgap', 'magmahunt'],
  },
  {
    id: 'bigger',
    title: 'Bigger things',
    note: 'The pipeline that produced the rest, and this site. Built directly, not generated.',
    repos: ['forge', 'arielb57.github.io'],
  },
];

/** The group the renderer creates for anything the lists above do not name. */
export const everythingElse = {
  id: 'other',
  title: 'Everything else',
  note: 'Public repositories that fit none of the groups above. Nothing is hidden.',
};

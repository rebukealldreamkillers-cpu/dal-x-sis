export const normalize = (value) => value.normalize('NFKC').toLowerCase()
  .replace(/\b(?:[a-z]\.){2,}[a-z]?\b|\b(?:[a-z]\.){2,}/g, (word) => word.replaceAll('.', ''))
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Index names readers use, not names inferred from initials or unrelated mentions.
const aliases = [
  ['National Crime Information Center', 'NCIC', 'FBI NCIC'],
  ['Federal Bureau of Investigation', 'FBI'],
  ['Financial Crimes Enforcement Network', 'FinCEN', 'US financial crimes bureau', 'Treasury FinCEN'],
  ['Department of the Treasury', 'Treasury Department', 'U.S. Treasury', 'US Treasury'],
  ['Bank Secrecy Act', 'BSA', 'BSA E-Filing'],
  ['Central Intelligence Agency', 'CIA'],
  ['Office of the Director of National Intelligence', 'ODNI', 'Director of National Intelligence'],
  ['Cybersecurity and Infrastructure Security Agency', 'CISA'],
  ['Department of Justice', 'DOJ', 'Justice Department'],
  ['Securities and Exchange Commission', 'SEC', 'SEC EDGAR'],
  ['Department of Health and Human Services', 'HHS'],
  ['HHS Office for Civil Rights', 'HHS OCR'],
  ['Internet Crime Complaint Center', 'IC3'],
  ['Known Exploited Vulnerabilities', 'CISA KEV', 'KEV'],
  ['United States Department of Agriculture', 'U.S. Department of Agriculture', 'USDA'],
  ['United States Coast Guard', 'U.S. Coast Guard', 'USCG'],
  ['University of New Mexico Health', 'UNM Health', 'UNM Health Sciences'],
  ['JPMorgan Chase', 'JP Morgan Chase', 'JPMorgan Chase Bank', 'Chase Bank', 'JPMC'],
  ['California Department of Justice', 'California DOJ', 'California Attorney General', 'California AG'],
  ['Oregon Department of Justice', 'Oregon DOJ', 'Oregon Attorney General', 'Oregon AG'],
  ['Washington State Attorney General', 'Washington Attorney General', 'Washington AG'],
  ['Vermont Attorney General', 'Vermont AG'],
  ['Iowa Attorney General', 'Iowa AG'],
  ['Idaho Attorney General', 'Idaho AG'],
  ['South Carolina Department of Consumer Affairs', 'South Carolina Consumer Affairs', 'SCDCA'],
].map((group) => group.map(normalize));

function contains(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

export function indexReport(report, context) {
  // Alias matching uses the headline and publisher, not incidental mentions in notes.
  const identity = normalize(`${report.title} ${report.source} ${report.entity ?? ''}`);
  const equivalents = aliases.filter((group) => group.some((alias) => contains(identity, alias))).flat();
  return `${normalize(context)} ${equivalents.join(' ')}`;
}

export function matchesReport(searchText, query) {
  const value = normalize(query);
  const group = aliases.find((entry) => entry.includes(value));
  if (group) return group.some((alias) => contains(searchText, alias));
  return value.split(' ').every((token) => searchText.includes(token));
}

export function breakingStoryKey(report) {
  // Keep one archived edition for this specific news cycle. Not a blanket merge of FBI stories.
  const date = report.date.slice(0, 10);
  if (report.kind !== 'news' || date < '2026-11-20' || date > '2026-11-26') return '';
  const headline = normalize(report.title);
  if (contains(headline, 'ncic') || contains(headline, 'national crime information center') ||
      (contains(headline, 'fbi') && /\b(?:crime|police|criminal(?: justice)?) database\b/.test(headline))) {
    return 'news:fbi-ncic:2026-11';
  }
  return '';
}

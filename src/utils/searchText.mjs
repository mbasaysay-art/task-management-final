// Search only the explicitly supplied display fields; never inspect whole account objects.
export function normalizeSearchText(value) {
  return (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
    .normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

export function matchesSearch(query, fields) {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const text = fields.flat(Infinity).map(normalizeSearchText).join(' ');
  return terms.every(term => text.includes(term));
}

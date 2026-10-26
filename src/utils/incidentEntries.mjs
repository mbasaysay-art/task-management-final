export function incidentEntries(report) {
  const source = report.entries?.length ? report.entries : [report];
  return source.map(({ entries, ...entry }) => ({ ...entry, photos: [...(entry.photos || [])] }));
}

export function updateIncidentEntry(entries, entryId, update) {
  return entries.map(entry => entry.id === entryId
    ? (typeof update === 'function' ? update(entry) : update)
    : entry);
}

export function saveIncidentEntries(report, entries) {
  const primary = entries[0];
  return { ...report, ...primary, id: report.id, srReference: report.srReference,
    entries: entries.length > 1 ? entries.map(entry => ({ ...entry, srReference: report.srReference })) : undefined,
    updatedAt: new Date().toISOString() };
}


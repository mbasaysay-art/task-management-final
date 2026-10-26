// Reading the next reference never reserves it. Only saved records advance it.
export function nextReportReference(records, kind, offset = 0, year = new Date().getFullYear()) {
  const prefix = kind === 'handover' ? `UAV-${year}-` : kind === 'incident' ? `UAV-IAR-${year}-` : `UAV-CDR-${year}-`;
  const field = kind === 'incident' ? 'srReference' : 'srNumber';
  const last = records.reduce((highest, record) => {
    const reference = record[field];
    if (typeof reference !== 'string' || !reference.startsWith(prefix)) return highest;
    const suffix = reference.slice(prefix.length);
    return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
  }, 0);
  return prefix + String(last + 1 + offset).padStart(kind === 'handover' ? 4 : 2, '0');
}


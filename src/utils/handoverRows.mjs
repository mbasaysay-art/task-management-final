export function removeHandoverRow(rows, rowId, blankRow) {
  const remaining = rows.filter(row => row.id !== rowId);
  if (remaining.length === rows.length) return rows;
  return [...remaining, blankRow].map((row, index) => ({ ...row, no: index + 1 }));
}


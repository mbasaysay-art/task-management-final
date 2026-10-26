import crypto from 'node:crypto';
export const inventoryEntities=['drones','batteries','accessories','streamingDevices'];
export function assetPlaceholderEmail(entity,id) {
 const text=String(id);
 const suffix=/^[0-9]+$/.test(text)?text.padStart(3,'0'):crypto.createHash('sha256').update(entity+':'+text).digest('hex').slice(0,12);
 return `asset-${entity==='drones'?'':entity+'-'}${suffix}@example.com`;
}
export function sanitizeAssetEmail(entity,record) {
 return inventoryEntities.includes(entity) && Object.hasOwn(record,'email')?{...record,email:assetPlaceholderEmail(entity,record.id)}:record;
}

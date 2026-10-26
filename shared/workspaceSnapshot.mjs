// Object property order is not an operational change. Keep array order and all
// permission/version fields, which can signal a real visibility or record change.
export const serializeWorkspace=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);

export function normalizeWindowTarget(input,features){
 if(!input||typeof input.page!=='string'||!features.some(feature=>feature.id===input.page))throw Error('Choose an available app page.');
 const menu=input.menu??'';if(typeof menu!=='string'||menu.length>240||/[\u0000-\u001f]/.test(menu))throw Error('Invalid submenu.');
 return {page:input.page,menu};
}
export function windowTargetQuery(target){const query=new URLSearchParams({screenPage:target.page});if(target.menu)query.set('screenMenu',target.menu);return '?'+query.toString();}
export function readWindowTarget(search,features){const query=new URLSearchParams(search),page=query.get('screenPage');if(!page)return null;try{return normalizeWindowTarget({page,menu:query.get('screenMenu')||''},features);}catch{return null;}}

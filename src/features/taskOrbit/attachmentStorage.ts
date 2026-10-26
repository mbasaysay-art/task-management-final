const MAX_FILE_BYTES=20*1024*1024;
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('fleet-task-workspace-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Attachment storage is unavailable in this browser.'));});}
export async function saveWorkspaceFile(scope:string,file:File){
 if(file.size>MAX_FILE_BYTES)throw Error('Choose a file no larger than 20 MB.');
 const key=encodeURIComponent(scope)+':'+crypto.randomUUID(),db=await database();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,key);tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error('Unable to save the attachment. Browser storage may be full.'));});return key;}finally{db.close();}
}
export async function readWorkspaceFile(scope:string,key:string):Promise<Blob>{
 if(!key.startsWith(encodeURIComponent(scope)+':'))throw Error('This attachment belongs to another account.');
 const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(key);request.onsuccess=()=>request.result instanceof Blob?resolve(request.result):reject(Error('Attachment file is unavailable in this browser.'));request.onerror=()=>reject(Error('Unable to read this attachment.'));});}finally{db.close();}
}

export function discussionFileParts(comment,attachments=[]){
 const candidates=new Map();for(const attachment of attachments){if(!attachment.name)continue;const matches=candidates.get(attachment.name)||[];matches.push(attachment);candidates.set(attachment.name,matches);}
 if(comment.attachment?.name){const ref=comment.attachment;const exact=attachments.find(item=>item.id===ref.id&&(!ref.storageKey||item.storageKey===ref.storageKey));const attachment=exact||{...ref,type:'',size:'',uploadedAt:''};candidates.set(ref.name,[attachment]);}
 const names=[...candidates.keys()].filter(name=>candidates.get(name).length===1).sort((a,b)=>b.length-a.length);const content=String(comment.content||'');const parts=[];let position=0;
 while(position<content.length){let found=-1,name='';for(const candidate of names){const index=content.indexOf(candidate,position);if(index>=0&&(found<0||index<found)){found=index;name=candidate;}}if(found<0){parts.push(content.slice(position));break;}if(found>position)parts.push(content.slice(position,found));parts.push({label:name,attachment:candidates.get(name)[0]});position=found+name.length;}
 return parts;
}
export function attachmentPreviewFormat(name,bytes){
 const signature=Array.from(bytes.slice(0,16)),ascii=String.fromCharCode(...signature);const starts=expected=>expected.every((value,index)=>signature[index]===value);
 if(starts([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return {kind:'image',mime:'image/png'};
 if(starts([0xff,0xd8,0xff]))return {kind:'image',mime:'image/jpeg'};
 if(ascii.startsWith('GIF87a')||ascii.startsWith('GIF89a'))return {kind:'image',mime:'image/gif'};
 if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')return {kind:'image',mime:'image/webp'};
 if(ascii.startsWith('BM'))return {kind:'image',mime:'image/bmp'};
 if(ascii.startsWith('%PDF-'))return {kind:'pdf',mime:'application/pdf'};
 const extension=String(name).split('.').pop().toLowerCase();
 if(['txt','csv','json','log','md','xml','yaml','yml'].includes(extension))return {kind:'text',mime:'text/plain'};
 if(['mp4','webm','ogv'].includes(extension))return {kind:'video',mime:({mp4:'video/mp4',webm:'video/webm',ogv:'video/ogg'})[extension]};
 if(['mp3','wav','ogg','m4a'].includes(extension))return {kind:'audio',mime:({mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'})[extension]};
 return {kind:'unsupported',mime:'application/octet-stream'};
}

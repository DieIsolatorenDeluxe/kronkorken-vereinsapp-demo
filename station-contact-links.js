(function(root){
 function tokens(value){
  const text=String(value||'');
  const pattern=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+49|0)[\d ()\/-]{5,}\d/gi;
  const parts=[];let cursor=0;
  for(const match of text.matchAll(pattern)){
   const raw=match[0];let href;
   if(raw.includes('@'))href='mailto:'+raw;
   else{const number=raw.replace(/[^\d+]/g,'');const digits=number.replace(/\D/g,'');if(digits.length<7||digits.length>15)continue;href='tel:'+(number.startsWith('+')?number:number.startsWith('00')?'+'+number.slice(2):'+49'+number.slice(1));}
   if(match.index>cursor)parts.push({text:text.slice(cursor,match.index)});
   parts.push({text:raw,href});cursor=match.index+raw.length;
  }
  if(cursor<text.length)parts.push({text:text.slice(cursor)});
  return parts;
 }
 const api={tokens};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VereinsStationContacts=api;
})(typeof window!=='undefined'?window:globalThis);

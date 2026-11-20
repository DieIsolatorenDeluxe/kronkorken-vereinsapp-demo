(function(root){
 const normalize=text=>String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
 const words=text=>[...new Set(normalize(text).split(' ').filter(Boolean))].sort().join(' ');
 function distance(a,b){const r=Math.PI/180;const x=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)));}
 function eligible(entry){return entry.status==='freigegeben'&&(entry.stationType==='oeffentlich'||entry.dropoffException===true);}
 function select(entries,origin,radius){
  const ranked=entries.map((entry,index)=>({index,km:distance(origin,entry.point)})).filter(row=>Number.isFinite(row.km)).sort((a,b)=>a.km-b.km);
  const inside=ranked.filter(row=>row.km<=radius);
  // Internal places remain visible in ordinary results, but are never suggested as a fallback drop-off.
  const nearbyDropoff=inside.some(row=>eligible(entries[row.index]));
  if(nearbyDropoff){const hits=inside.slice(0,5);if(!hits.some(row=>eligible(entries[row.index]))){hits[hits.length-1]=inside.find(row=>eligible(entries[row.index]));hits.sort((a,b)=>a.km-b.km);}return {hits,fallback:false};}
  const nearest=ranked.filter(row=>eligible(entries[row.index])).slice(0,3);
  return {hits:[...nearest,...inside.filter(row=>!eligible(entries[row.index])).slice(0,2)],fallback:true,nearest:nearest[0]};
 }
 function candidates(features){
  const result=[],seen=new Set();
  for(const feature of features||[]){const p=feature.properties||{},c=feature.geometry?.coordinates;if(!Array.isArray(c)||c.length<2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90)continue;if(String(p.countrycode||'').toUpperCase()!=='DE')continue;
   const label=[...new Set([p.name,p.district,p.city||p.town||p.village,p.postcode,p.state].filter(Boolean))].join(', ');
   const key=normalize(label);if(!label||seen.has(key))continue;seen.add(key);
   result.push({label,point:[c[1],c[0]],name:p.name||'',city:p.city||p.town||p.village||'',postcode:p.postcode||'',type:p.osm_value||p.type||''});
  }
  return result;
 }
 function exactCandidate(list,query){const target=words(query);const matches=list.filter(c=>[c.name,c.postcode,c.name+' '+c.city].some(s=>words(s)===target));return matches.length===1?matches[0]:list.length===1?list[0]:null;}
 function stationMatch(entries,query){const q=normalize(query);if(q.length<3||/^\d+$/.test(q))return null;const result=entries.filter(entry=>{const whole=normalize(entry.name),main=normalize(entry.name.split(' – ')[0]);return whole===q||main===q||main.includes(q);});return result.length===1?result[0]:null;}
 const groups=[
  {terms:['kita','kindertagesstatte','kindertagespflege','kindergarten','schule','schulen','hort'],pattern:/kindertages|kindergarten|\bschule\b|\bhort\b/},
  {terms:['gartenbau','gartnerei','gartenbetrieb','pflanzen'],pattern:/gartenbau|gartnerei/},
  {terms:['auto','autos','autowerkstatt','werkstatt','autohaus','autoteile','fahrzeugbetrieb'],pattern:/autohaus|autoteile/},
  {terms:['tankstelle','tanke','benzin'],pattern:/tankstelle/},
  {terms:['getranke','getrankemarkt','getrankehandel'],pattern:/getranke/},
  {terms:['gastronomie','restaurant','cafe','imbiss','grill','gasthof'],pattern:/restaurant|cafe|imbiss|grill|gasthof|zicken schulze/},
  {terms:['logistik','grossmengen','grossmenge','container'],pattern:/logistikstutzpunkt/}
 ];
 function similar(a,b){if(a===b||b.startsWith(a)&&a.length>=4)return true;if(a.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}return edits+(i<a.length||j<b.length?1:0)<=1;}
 function searchStations(entries,query){
  const q=normalize(query),parts=q.split(' ').filter(Boolean);if(!q||/^\d+$/.test(q))return [];
  const explicitCategory=groups.find(group=>parts.some(part=>group.terms.includes(part)))||(parts.length===1&&!entries.some(entry=>normalize(entry.name).split(' ').includes(parts[0]))?groups.find(group=>group.terms.some(term=>similar(parts[0],term))):null);
  return entries.filter(entry=>{
   const name=normalize(entry.name),main=normalize(entry.name.split(' – ')[0]);const group=groups.filter(g=>g.pattern.test(name));
   if(explicitCategory&&!explicitCategory.pattern.test(name))return false;
   const location=normalize((entry.address||'')+' '+(entry.city||''));const mainWords=main.split(' ').filter(w=>w.length>2&&!['und','der','die','das','zum','am','bei'].includes(w));
   const isName=parts.some(part=>mainWords.some(word=>similar(part,word))&&!location.split(' ').includes(part));
   if(!explicitCategory&&!isName)return false;
   const haystack=(name+' '+location+' '+(entry.notes?normalize(entry.notes):'')+' '+group.flatMap(g=>g.terms).join(' ')).split(' ');
   return parts.every(part=>haystack.some(word=>similar(part,word)));
  });
 }
 const memory=new Map();let lastRequest=0;
 async function lookup(query,config,signal){const key=normalize(query);const cached=memory.get(key);if(cached&&cached.until>Date.now())return cached.items;
  const wait=Math.max(0,1100-(Date.now()-lastRequest));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');lastRequest=Date.now();
  const url=new URL(config.endpoint);url.searchParams.set('q',query);url.searchParams.set('lang','de');url.searchParams.set('limit','6');url.searchParams.set('countrycode','DE');if(!/^\d{5}$/.test(query.trim()))for(const layer of ['city','district','locality'])url.searchParams.append('layer',layer);
  const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin'});if(!response.ok)throw Error('Ortssuche nicht erreichbar');const data=await response.json();const items=candidates(data.features);if(memory.size>60)memory.delete(memory.keys().next().value);memory.set(key,{until:Date.now()+3600000,items});return items;
 }
 const api={normalize,distance,eligible,select,candidates,exactCandidate,stationMatch,searchStations,lookup};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VereinsPlaceSearch=api;
})(typeof window!=='undefined'?window:globalThis);

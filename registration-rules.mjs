export const institutionTypes = ['Privatperson','Unternehmen / Betrieb','Gastronomie','Einzelhandel','Verein','Kindertagesstätte / Kindergarten','Schule','Hort','Kinder- und Jugendeinrichtung','Sonstige Einrichtung'];
export const protectedTypes = new Set(institutionTypes.slice(5,9));
export const internalNotice = 'Interne Sammelstelle – keine öffentliche Abgabemöglichkeit.';
export const internalExplanation = 'Diese Einrichtung unterstützt unsere Sammelaktion und sammelt ausschließlich intern. Eine direkte Abgabe durch externe Personen ist nicht möglich.';
export const childNotice = 'Zum Schutz der Kinder und Jugendlichen werden Kindertagesstätten, Schulen, Horte und vergleichbare Einrichtungen grundsätzlich als interne Sammelstellen geführt. Eine öffentliche Abgabe von Sammelmaterialien ist nicht möglich. Gerne präsentieren wir eure Einrichtung mit eurem Einverständnis als Unterstützer unserer Sammelaktion.';
export const permissionNotice = 'Für die Anmeldung als öffentliche Sammelstelle benötigen wir die entsprechenden Freigaben. Ohne diese können wir eure Einrichtung ausschließlich als interne Sammelstelle führen.';
export function validateRegistration(value, {signature=true, test=true}={}) {
 const errors={};
 const required=(key,label)=>{if(typeof value[key]!=='string'||!value[key].trim()) errors[key]=label+' bitte ausfüllen.';};
 for(const [key,label] of Object.entries({name:'Name / Ansprechpartner',street:'Straße und Hausnummer',postcode:'PLZ',city:'Ort',email:'E-Mail',phone:'Telefon',date:'Datum'}))required(key,label);
 if(!['sammler','sammelstelle'].includes(value.registrationType))errors.registrationType='Bitte Sammler oder Sammelstelle auswählen.';
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.email||''))errors.email='Bitte eine gültige E-Mail-Adresse eingeben.';
 if(!/^\d{5}$/.test(value.postcode||''))errors.postcode='Bitte eine fünfstellige PLZ eingeben.';
 if(!/^[+\d ()\/-]{6,30}$/.test(value.phone||''))errors.phone='Bitte eine gültige Telefonnummer eingeben.';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value.date||'')||Number.isNaN(Date.parse(value.date)))errors.date='Bitte ein gültiges Datum eingeben.';
 if(value.consentInternal!==true)errors.consentInternal='Die interne Datenverarbeitung bitte bestätigen.';
 if(value.consentPrivacy!==true)errors.consentPrivacy='Die Datenschutzhinweise bitte bestätigen.';
 if(test&&value.fictional!==true)errors.fictional='In diesem Test bitte ausschließlich fiktive Angaben verwenden und bestätigen.';
 for(const key of ['consentMap','consentSocial'])if(value[key]!==undefined&&typeof value[key]!=='boolean')errors[key]='Bitte eine eindeutige Auswahl treffen.';
 if(!value.permissions||typeof value.permissions!=='object'||Array.isArray(value.permissions)||Object.values(value.permissions).some(v=>typeof v!=='boolean'))errors.permissions='Ungültige Veröffentlichungsfreigaben.';
 const station=value.registrationType==='sammelstelle';
 if(station){
  required('stationName','Name der Sammelstelle');
  if(!institutionTypes.includes(value.institutionType))errors.institutionType='Bitte die Einrichtungsart auswählen.';
  if(!['intern','oeffentlich'].includes(value.stationType))errors.stationType='Bitte die Sammelstellenart auswählen.';
  if(protectedTypes.has(value.institutionType)&&value.stationType!=='intern')errors.stationType='Kinder- und Bildungseinrichtungen können ausschließlich intern sammeln.';
  if(!['oeffentlich','vereinsintern'].includes(value.visibility))errors.visibility='Bitte die Sichtbarkeit auswählen.';
  if(value.visibility==='oeffentlich'&&(!value.permissions?.stationName||!value.permissions?.city||!value.consentMap))errors.permissions='Für einen sichtbaren Eintrag bitte Name der Einrichtung, PLZ / Ort und Karte / Website freigeben.';
  if(value.stationType==='oeffentlich'&&(value.visibility!=='oeffentlich'||!value.permissions?.address||!value.permissions?.stationName||!value.permissions?.city||!value.consentMap))errors.permissions=permissionNotice;
 }else if(value.registrationType==='sammler'&&(value.visibility!=='vereinsintern'||Object.values(value.permissions||{}).some(Boolean)||value.consentMap||value.consentSocial))errors.visibility='Sammler werden ausschließlich vereinsintern geführt.';
 if(signature){
  if(!Array.isArray(value.signature)||value.signature.length<1||value.signature.length>300||value.signature.some(stroke=>!Array.isArray(stroke)||stroke.length<2||stroke.length>2000||stroke.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1))))errors.signature='Bitte im Unterschriftsfeld unterschreiben.';
 }
 for(const [key,item] of Object.entries(value))if(typeof item==='string'&&(item.length>4000||/[\u0000\u000b\u000c]/.test(item)))errors[key]='Die Eingabe ist zu lang oder enthält ungültige Zeichen.';
 return errors;
}
// Only explicitly approved fields may leave the protected registration database.
export function publicProjection(record){
 if(record.status!=='freigegeben'||record.registrationType!=='sammelstelle'||record.visibility!=='oeffentlich'||!record.consentMap||!record.permissions?.stationName||!record.permissions?.city)return null;
 if(protectedTypes.has(record.institutionType)&&record.stationType!=='intern')return null;
 if(!['intern','oeffentlich'].includes(record.stationType))return null;
 if(record.stationType==='oeffentlich'&&!record.permissions?.address)return null;
 const result={id:record.id,name:record.stationName,city:record.city,postcode:record.postcode,stationType:record.stationType,institutionType:record.institutionType};
 if(record.stationType==='intern'){result.notice=internalNotice;result.description=internalExplanation;return result;}
 for(const [permission,field] of [['address','street'],['hours','hours'],['contact','name'],['phone','phone'],['email','email']])if(record.permissions[permission])result[field]=record[field];
 return result;
}

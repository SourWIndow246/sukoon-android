// These guards are a safety backstop, not a clinical decision engine.
export function profileLimit(profiles, type, premium) {
  if (premium) return null;
  if (profiles.length >= 5) return 'Your free family has 5 members. Upgrade to add more.';
  const cap = type === 'Adult' ? 2 : 3;
  if (profiles.filter(p => p.type === type).length >= cap) return `The free plan includes ${cap} ${type.toLowerCase()} profiles. Upgrade to add more.`;
  return null;
}
export function hasUrgentWords(text) {
  // Generic chest pain or a named disease needs contextual model assessment.
  // This backstop is deliberately limited; it is not the complete safety screen.
  const symptoms=positiveSymptomText(text)
    .replace(/\b(?:not|never)\s+(?:unconscious|having a seizure|struggling to breathe)\b/gi,' ')
    .replace(/\bbehosh\s+(?:nahi|nahin)(?:\s+(?:hai|hoon))?\b/gi,' ')
    .replace(/बेहोश\s+नहीं/g,' ');
  return /can't breathe|cannot breathe|struggling to breathe|severe\s+(?:trouble|difficulty)\s+breathing|severe\s+(?:shortness of breath|breathlessness)|persistent chest pain|chest pain[^.!?]*(?:sweat|breathless|spreading)|saans nahi|saans nahin|unconscious|behosh|not waking|blue lips|having a seizure|one.side[^.!?]*weak|suicid|self.harm|bleeding[^.!?]*(?:won't stop|will not stop|doesn't stop|cannot stop|can't stop)|(?:heavy|uncontrollable)\s+bleeding|worst headache|sudden[^.!?]*weakness|sudden\s+(?:severe|worst)\s+headache|खून[^.!?]*(?:रुक नहीं|नहीं रुक)|बेहोश|सांस नहीं/i.test(symptoms);
}
export function positiveSymptomText(text) {
  // Only remove explicit, local denials. Never interpret “not sure”, “no longer”,
  // resolved neurological symptoms or an unknown history as absence.
  return text.replace(/\b(?:no|without|deny|denies|denying)\s+(?:any\s+)?(?:chest pain|shortness of breath|breathing difficulty|fever|cough|headache|vomiting|bleeding|weakness|seizures?)(?=\s*(?:[,.!?;]|$|but\b|and\b|or\b))/gi,' ')
    .replace(/\b(?:chest pain|fever|cough|headache|vomiting)\s+(?:is\s+)?(?:absent|nahi hai|nahin hai)\b/gi,' ');
}
export function ancestorFlags(profileId, profiles) {
  const visited = new Set([profileId]); const found = [];
  const visit = id => { if (visited.has(id)) return; visited.add(id); const p=profiles.find(x=>x.id===id); if(!p)return; for(const condition of p.hereditary??[]) found.push({condition,relative:p.name}); for(const id of p.parentIds??[]) visit(id); };
  for (const id of profiles.find(x=>x.id===profileId)?.parentIds??[]) visit(id);
  return found;
}
export function createsCycle(childId, parentId, profiles) {
  const visited=new Set(); const visit=id=>{if(id===childId)return true;if(visited.has(id))return false;visited.add(id);return (profiles.find(p=>p.id===id)?.parentIds??[]).some(visit)};
  return visit(parentId);
}
export function familyLayers(profiles) {
  const memo=new Map();
  const level=(id,seen=new Set())=>{if(memo.has(id))return memo.get(id);if(seen.has(id))return 0;const next=new Set(seen);next.add(id);const p=profiles.find(x=>x.id===id);const parents=(p?.parentIds??[]).filter(id=>profiles.some(x=>x.id===id));const depth=parents.length?1+Math.max(...parents.map(id=>level(id,next))):0;memo.set(id,depth);return depth;};
  const rows=[];for(const p of profiles){const depth=level(p.id);(rows[depth]??=[]).push(p);}return rows.filter(Boolean);
}
export const emergencyTriage = {
  colour:'red', title:'Get urgent medical help', summary:'You mentioned a possible emergency warning sign. Please do not wait for more chat questions.',
  possibilities:['An urgent in-person assessment is needed; chat cannot determine the cause.'],
  steps:['Call 112 in India, or your local emergency number.','Ask someone to stay with you and help you reach emergency care.','Take your medication list and medical records if readily available.'],
  watchFor:['Do not wait for symptoms to get worse before seeking help.'],doctor:'Emergency department',followup:'After getting care, add your doctor’s notes to your health record.'
};

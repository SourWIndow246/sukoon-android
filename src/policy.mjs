// These guards are a safety backstop, not a clinical decision engine.
export function profileLimit(profiles, type, premium) {
  if (premium) return null;
  if (profiles.length >= 5) return 'Your free family has 5 members. Upgrade to add more.';
  const cap = type === 'Adult' ? 2 : 3;
  if (profiles.filter(p => p.type === type).length >= cap) return `The free plan includes ${cap} ${type.toLowerCase()} profiles. Upgrade to add more.`;
  return null;
}
export function hasUrgentWords(text) {
  // Negation is intentionally not treated as reassurance. Ask explicitly in live flow.
  return /can't breathe|cannot breathe|struggling to breathe|severe.*breath|chest pain|seene? me(?:in)? dard|saans nahi|saans nahin|unconscious|behosh|not waking|blue lips|seizure|stroke|one.side.*weak|suicid|self.harm|bleeding.*(?:stop|heav)|worst headache|sudden.*(?:weakness|headache)|खून.*नहीं|बेहोश|सांस नहीं/i.test(text);
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

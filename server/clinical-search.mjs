import { positiveSymptomText } from '../src/policy.mjs';

// Small reference index for retrieval, NOT a disease probability model. Links were
// checked 2026-10-13. Matching keywords do not establish or exclude a diagnosis.
const sources = {
  cough:'https://www.nhs.uk/symptoms/cough/',
  head:'https://www.nhs.uk/symptoms/headaches/',
  abdomen:'https://www.nhs.uk/symptoms/stomach-ache/',
  chest:'https://www.nhs.uk/symptoms/chest-pain/',
  urinary:'https://www.nhs.uk/conditions/urinary-tract-infections-utis/',
};
const entry=(name,terms,source)=>({name,terms,source:sources[source]});
export const referenceIndex = [
  entry('Cold or influenza',['cough','runny nose','sore throat','khansi','bukhar'],'cough'),
  entry('Allergic rhinitis',['sneezing','itchy eyes','runny nose','cough'],'cough'),
  entry('Bronchitis',['cough','mucus','khansi'],'cough'),
  entry('COVID-19',['cough','khansi'],'cough'),
  entry('Acid reflux',['heartburn','sour taste','after eating','cough'],'cough'),
  entry('Migraine',['headache','sar dard','sir dard'],'head'),
  entry('Dehydration-related headache',['headache','sar dard','sir dard','less urine'],'head'),
  entry('Medication-overuse headache',['headache','painkillers'],'head'),
  entry('Constipation',['constipation','cannot poo','hard stool'],'abdomen'),
  entry('Gastroenteritis or food poisoning',['diarrhoea','diarrhea','vomiting','loose motions','ulti'],'abdomen'),
  entry('Indigestion',['bloating','heartburn','after eating'],'abdomen'),
  entry('Irritable bowel syndrome',['cramps','bloating','diarrhoea','constipation'],'abdomen'),
  entry('Appendicitis',['lower right','right lower'],'abdomen'),
  entry('Kidney stones',['groin','pain when peeing'],'abdomen'),
  entry('Gallstones',['under right ribs','upper right abdomen'],'abdomen'),
  entry('Urinary tract infection',['burning urine','burning when peeing','frequent urination','cloudy urine','pain when peeing'],'urinary'),
  entry('Chest muscle strain',['chest pain','chest injury'],'chest'),
  entry('Pneumonia',['chest pain','cough','mucus'],'chest'),
  entry('Acute coronary syndrome',['chest pain','chest pressure'],'chest'),
];
export function searchClinicalReferences(messages) {
  const text=positiveSymptomText(messages.filter(m=>m.role==='user').map(m=>m.content).join('\n')).toLowerCase();
  const matches=referenceIndex.map(({terms,...item})=>({...item,matchedTerms:terms.filter(term=>new RegExp(`\\b${term}\\b`,'i').test(text))}))
    .filter(item=>item.matchedTerms.length).sort((a,b)=>b.matchedTerms.length-a.matchedTerms.length);
  // Do not truncate the model's search space just to meet the display limit.
  return {version:'2026-10-13',kind:'limited reference retrieval; not clinically validated',matches,
    limitations:'Keyword relevance is not likelihood. This index is incomplete, especially for children, pregnancy and local infectious disease. Negation/language support is limited. Consider alternatives outside it. Never infer mortality, rule out illness, or choose urgency from match counts.'};
}
export function referenceLinks(retrieval) {
  return [...new Set(retrieval.matches.map(item=>item.source))].map(url=>({title:'NHS symptom reference',url}));
}

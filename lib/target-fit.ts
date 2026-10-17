// Heuristics for review prioritization only. These signals never disqualify a
// business or claim it is independent, operating, or ready to buy.
export type TargetFit = 'likely_target'|'review_fit'|'possible_out_of_scope';
export type TargetFitAssessment={fit:TargetFit;label:string;reason:string};

const LOCAL_CUSTOMER=/\b(shop|store|boutique|restaurant|cafe|coffee|bakery|barber|salon|spa|nail|dentist|dental|doctor|clinic|vet|groom|plumb|electric|hvac|landscap|roof|clean|handyman|repair|auto|florist|laundry|cater|limo|photograph|accountant|insurance|attorney|lawyer|tutor|daycare|child care|fitness|gym|yoga|chiropract|physical therap|real estate|realty|health care|medical service|wellness service|personal or beauty service|home service|automotive service|food and beverage store|casual eatery|dental clinic)\w*\b/i;
const OUT_OF_SCOPE=/\b(university|college|hospital|government|municipal|school district|nonprofit|non-profit|charity|foundation|association|manufacturer|wholesale|distributor|marketing agency|advertising agency|web design agency|software company|saas|enterprise|b2b only)\b/i;
const CHAIN=/\b(chain|franchise|franchised|national brand|corporate location)\b/i;

export function assessTargetFit(name:string,category:string|null|undefined):TargetFitAssessment{
 const text=[name,category||''].filter(Boolean).join(' ');
 if(OUT_OF_SCOPE.test(text))return {fit:'possible_out_of_scope',label:'Possible poor fit',reason:'Name or category suggests an institution, agency, supplier, or B2B organization. Check before spending research time.'};
 if(CHAIN.test(text))return {fit:'review_fit',label:'Ownership needs review',reason:'A chain or franchise clue appears. Check whether a local owner can choose the website or marketing provider.'};
 if(LOCAL_CUSTOMER.test(text))return {fit:'likely_target',label:'Likely local prospect',reason:'Name or category suggests a customer-facing local service or storefront. Independence and ownership still need review.'};
 return {fit:'review_fit',label:'Target fit unclear',reason:'The available name and category do not establish that this is a local customer-facing business.'};
}

// Fictional benchmark corpus for the generator feedback loop.
//
// Every business, person, phone number (555-01xx), domain (.example, reserved
// by RFC 2606) and review note below is invented for testing. None of it is a
// claim about a real business. Reviewer notes are synthetic feedback written
// in the style of real design reviews; they exist to test whether the loop
// learns general constraints, and are labelled as such wherever reported.
//
// Three kinds of reviewer notes, kept apart:
//  - `feedback` (train businesses, plain reviewer style): the only notes the
//    loop learns from.
//  - `devFeedback` (train businesses, paraphrased): used to tune the
//    interpreter. Never learned from.
//  - `heldOutFeedback` (holdout businesses only): written BEFORE interpreter
//    tuning in voices absent from training (designer jargon, terse,
//    client voice, emotional, adversarial). Each carries `expect`, the
//    adjustments a careful human would read from it. Holdout agreement is
//    scored against `expect`, not against the interpreter's own reading, so
//    the benchmark cannot reward the interpreter's wording.
// Withheld industries (never in train): legal, nonprofit, financial,
// automotive, unusual. Withheld reviewer styles: designer, terse, client,
// emotional, adversarial.
import type {BusinessFacts} from '../lib/generator-loop/design-space.ts';

export type ReviewerStyle='plain'|'paraphrase'|'designer'|'terse'|'client'|'emotional'|'adversarial';
/** "dimension:op[:value]" with op in prefer|avoid|more|less|keep. */
export type Expectation=string;
export type Note={rating:number;notes:string;tags?:string[];style?:ReviewerStyle;expect?:Expectation[]};
export type CorpusEntry={
 split:'train'|'holdout';
 /** Which bundled generated-imagery set suits the subject matter. */
 imageSet:'medical'|'landscaping'|'universal';
 facts:Omit<BusinessFacts,'imagery'>&{imagery:Omit<BusinessFacts['imagery'],'generated'>};
 feedback?:Note[];
 devFeedback?:Note[];
 heldOutFeedback?:Note[];
};

const site=(slug:string)=>`https://${slug}.example`;
const noImages={generatedAllowed:true,authorizedHost:null,businessImages:[]};
const authorized=(slug:string,n:number,foreign=false)=>({generatedAllowed:true,authorizedHost:`${slug}.example`,
 businessImages:[...Array.from({length:n},(_,i)=>({url:`${site(slug)}/media/photo-${i+1}.jpg`,alt:`Photo ${i+1} from the ${slug.replace(/-/g,' ')} website`,role:i?'gallery' as const:'hero' as const})),
  ...(foreign?[{url:'https://images.stock-library.example/generic-team.jpg',alt:'Stock photo of a generic team',role:'team' as const}]:[])]});
const unauthorized=(slug:string,n:number)=>({generatedAllowed:true,authorizedHost:null,
 businessImages:Array.from({length:n},(_,i)=>({url:`${site(slug)}/media/photo-${i+1}.jpg`,alt:`Photo ${i+1} from the website`,role:'gallery' as const}))});

export const corpus:CorpusEntry[]=[
 // ---------------- healthcare
 {split:'train',imageSet:'medical',facts:{id:'fx-harbor-dental',name:'Harbor Point Dental',industry:'healthcare',city:'Quincy',
  about:'Harbor Point Dental is a two-dentist practice treating adults and children. The office has evening hours twice a week. New patients are seen within ten days.',
  offerings:['Cleanings and exams','Fillings and crowns','Dental implants','Clear aligners','Emergency visits'],conversion:'book',conversionUrl:`${site('harbor-point-dental')}/book`,
  phone:'617-555-0101',address:'40 Hancock St, Quincy',hours:['Mon 8-7','Tue 8-5','Wed 8-7','Thu 8-5','Fri 8-2'],
  team:[{name:'Dr. Amara Chen, DMD',role:'General dentist'},{name:'Dr. Luis Ortega, DDS',role:'Prosthodontist'}],
  proof:['Member, Massachusetts Dental Society','Accepts most PPO plans'],faq:[{q:'Do you see children?',a:'Yes, from age three.'}],
  imagery:authorized('harbor-point-dental',2,true)},
  devFeedback:[{rating:3,style:'paraphrase',notes:'Patients want to know who is treating them, so put the bios near the top. Fewer pictures.',expect:['hierarchy:prefer:proof-first', 'imageryDensity:less']}],
  feedback:[{rating:2,notes:'The dentists and their credentials are buried at the bottom, patients want to see who treats them first. The animations feel slow and distracting for a dental office. Way too many photos.',tags:['layout'],expect:['hierarchy:prefer:proof-first', 'motionSystem:less', 'imageryDensity:less']}]},
 {split:'train',imageSet:'medical',facts:{id:'fx-cedar-physio',name:'Cedar Lane Physical Therapy',industry:'healthcare',city:'Framingham',
  about:'Cedar Lane is an outpatient physical therapy clinic focused on sports injuries and post-surgical rehab. Each visit is one-on-one with a licensed therapist.',
  offerings:['Post-surgical rehab','Sports injury care','Vestibular therapy','Dry needling'],conversion:'book',conversionUrl:`${site('cedar-lane-pt')}/schedule`,
  phone:'508-555-0102',address:'12 Cedar Ln, Framingham',hours:['Mon-Thu 7-7','Fri 7-3'],
  team:[{name:'Dana Ruiz, DPT',role:'Clinic director'},{name:'Sam Okafor, DPT',role:'Sports specialist'},{name:'Jo Park, PTA',role:'Assistant'}],
  process:['Evaluation','Treatment plan','Weekly sessions','Home program'],proof:['Licensed physical therapists','In network with major insurers'],imagery:noImages},
  feedback:[{rating:3,notes:'Credentials should be higher up, before the services. Motion is too much for a clinic, keep it subtle. The layout itself works.',expect:['hierarchy:prefer:proof-first', 'motionSystem:less']}]},
 {split:'holdout',imageSet:'medical',facts:{id:'fx-maple-vet',name:'Maple Street Animal Clinic',industry:'healthcare',city:'Malden',audience:'families',
  about:'A small-animal veterinary clinic for cats and dogs. Same-day sick visits are held each morning.',
  offerings:['Wellness exams','Vaccinations','Dental cleanings','Same-day sick visits'],conversion:'call',phone:'781-555-0103',
  address:'88 Maple St, Malden',hours:['Mon-Fri 8-6','Sat 9-1'],team:[{name:'Dr. Ines Varga, DVM',role:'Veterinarian'}],
  proof:['AAHA accredited','Fear Free certified staff'],urgent:true,imagery:unauthorized('maple-street-vet',3)},
  heldOutFeedback:[{rating:2,style:'designer',notes:'Hierarchy is off: the DVM and the AAHA accreditation belong above the fold. Entrance effects read as gratuitous for a clinic.',expect:['hierarchy:prefer:proof-first', 'motionSystem:less']}]},
 // ---------------- restaurants
 {split:'train',imageSet:'universal',facts:{id:'fx-ember-oven',name:'Ember & Oven',industry:'restaurant',city:'Somerville',
  about:'A wood-fired pizza restaurant with a short seasonal menu and natural wine. Walk-ins only on weekends.',
  offerings:['Wood-fired pizza','Seasonal small plates','Natural wine','Takeout'],conversion:'order',conversionUrl:`${site('ember-oven')}/order`,
  phone:'617-555-0104',address:'300 Elm St, Somerville',hours:['Tue-Thu 5-10','Fri-Sat 5-11','Sun 4-9'],visualWork:true,
  imagery:authorized('ember-oven',5)},
  devFeedback:[{rating:3,style:'paraphrase',notes:'The pizza should be the hero, show a lot more of it. The menu belongs before the backstory.',expect:['imageryDensity:more', 'hierarchy:prefer:offer-first']}],
  feedback:[{rating:2,notes:'Needs way more food photos, it feels text heavy. The menu should come first, before the story. Love the dramatic motion.',expect:['imageryDensity:more', 'hierarchy:prefer:offer-first']}]},
 {split:'train',imageSet:'universal',facts:{id:'fx-lotus-noodle',name:'Lotus Noodle Bar',industry:'restaurant',city:'Allston',
  about:'Hand-pulled noodles and broths made daily. Counter service with a few communal tables.',
  offerings:['Hand-pulled noodles','Bone broth ramen','Vegetarian bowls','Dumplings'],conversion:'order',conversionUrl:`${site('lotus-noodle')}/order`,
  phone:'617-555-0105',address:'1 Harvard Ave, Allston',hours:['Daily 11-10'],visualWork:true,imagery:noImages},
  feedback:[{rating:3,notes:'Not enough pictures of the food. Menu first please. The order button is hard to find on mobile, it should be a sticky bar.',expect:['imageryDensity:more', 'hierarchy:prefer:offer-first', 'ctaStructure:prefer:sticky-bar']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-tide-truck',name:'Tide Line Fish Truck',industry:'restaurant',city:'Gloucester',
  about:'A fish taco truck that parks at the harbor from May to October. The weekly schedule is posted each Monday.',
  offerings:['Fish tacos','Lobster rolls','Clam chowder'],conversion:'visit',phone:'978-555-0106',hours:['Thu-Sun 11-7, May-Oct'],
  address:'Harbor Loop, Gloucester',visualWork:true,imagery:noImages},
  heldOutFeedback:[{rating:2,style:'terse',notes:'food pics. more of them. menu up front.',expect:['imageryDensity:more', 'hierarchy:prefer:offer-first']}]},
 // ---------------- retail
 {split:'train',imageSet:'universal',facts:{id:'fx-paper-fern',name:'Paper & Fern',industry:'retail',city:'Jamaica Plain',
  about:'A stationery and houseplant shop. Weekly terrarium workshops run on Saturdays.',
  offerings:['Stationery','Houseplants','Terrarium workshops','Gift wrapping'],conversion:'visit',phone:'617-555-0107',
  address:'700 Centre St, Jamaica Plain',hours:['Tue-Sun 10-6'],visualWork:true,imagery:authorized('paper-fern',4)},
  feedback:[{rating:3,notes:'Hours and location need to be up top, people want to know when to visit. Photos are great. The card grid looks generic.',expect:['hierarchy:prefer:action-first', 'composition:avoid:bento']}]},
 {split:'train',imageSet:'universal',facts:{id:'fx-gear-loft',name:'Gear Loft Outfitters',industry:'retail',city:'Concord',
  about:'An independent outdoor gear shop with rentals and a repair bench for skis and bikes.',
  offerings:['Camping gear','Ski and bike repair','Gear rentals','Trail maps'],conversion:'visit',phone:'978-555-0108',
  address:'5 Main St, Concord',hours:['Mon-Sat 9-7','Sun 10-5'],visualWork:true,imagery:noImages},
  feedback:[{rating:2,notes:'Bury nothing: hours and address first. The page feels like a template, the cards are boxy and generic. Text is too wordy.',expect:['hierarchy:prefer:action-first', 'composition:avoid:bento', 'copyDepth:less']}]},
 // ---------------- trades
 {split:'train',imageSet:'landscaping',facts:{id:'fx-northside-electric',name:'Northside Electric',industry:'trades',city:'Medford',serviceMode:'on-site',
  about:'Licensed electricians for homes and small businesses. Emergency calls are answered around the clock.',
  offerings:['Panel upgrades','EV charger installs','Lighting','Emergency repairs','Inspections'],conversion:'call',phone:'781-555-0109',
  serviceArea:['Medford','Malden','Somerville','Arlington','Everett'],proof:['Massachusetts master electrician license','Insured'],
  urgent:true,process:['Call or text','On-site assessment','Written quote','Scheduled work'],imagery:noImages},
  devFeedback:[{rating:3,style:'paraphrase',notes:'On a phone the call option disappears once you scroll. Keep it pinned.',expect:['ctaStructure:prefer:sticky-bar']}],
  feedback:[{rating:2,notes:'The call button must always be visible on phones. Too many images, nobody needs photos of wires. Too much white space, feels empty.',expect:['ctaStructure:prefer:sticky-bar', 'imageryDensity:less', 'spacing:less']}]},
 {split:'train',imageSet:'landscaping',facts:{id:'fx-keel-roofing',name:'Keel Roofing',industry:'trades',city:'Braintree',serviceMode:'on-site',
  about:'A family roofing contractor doing asphalt, slate and flat roofs, with free written estimates.',
  offerings:['Roof replacement','Slate repair','Flat roofs','Gutters'],conversion:'quote',conversionUrl:`${site('keel-roofing')}/estimate`,
  phone:'781-555-0110',serviceArea:['Braintree','Quincy','Weymouth','Milton'],process:['Free inspection','Written estimate','Install','Cleanup'],
  proof:['Licensed and insured','GAF certified installer'],imagery:authorized('keel-roofing',3)},
  feedback:[{rating:3,notes:'Phone bar should be sticky on mobile. Fewer photos. The process section is clear, keep it.',expect:['ctaStructure:prefer:sticky-bar', 'imageryDensity:less']}]},
 // ---------------- fitness
 {split:'train',imageSet:'universal',facts:{id:'fx-anvil-strength',name:'Anvil Strength Club',industry:'fitness',city:'Waltham',
  about:'A small-group strength gym. Classes are capped at eight people with a coach on the floor.',
  offerings:['Small-group strength','Personal training','Mobility classes','Intro week'],conversion:'enroll',conversionUrl:`${site('anvil-strength')}/intro`,
  phone:'781-555-0111',address:'20 Moody St, Waltham',hours:['Mon-Fri 6am-8pm','Sat 8-12'],
  team:[{name:'Rae Collins',role:'Head coach'},{name:'Theo Nakamura',role:'Coach'}],visualWork:true,imagery:noImages},
  devFeedback:[{rating:3,style:'paraphrase',notes:'Type is too timid for a strength gym, go heavier. It feels lifeless, add some movement.',expect:['typography:prefer:grotesk-display', 'motionSystem:more']}],
  feedback:[{rating:3,notes:'Bold heavy type would fit a gym. The page feels static, more motion. Colors are too quiet, go darker and moodier.',expect:['typography:prefer:grotesk-display', 'motionSystem:more', 'palette:prefer:graphite']}]},
 {split:'train',imageSet:'universal',facts:{id:'fx-still-water-yoga',name:'Still Water Yoga',industry:'fitness',city:'Arlington',
  about:'A yoga studio offering slow flow, restorative and prenatal classes in a single quiet room.',
  offerings:['Slow flow','Restorative','Prenatal yoga','Beginner series'],conversion:'book',conversionUrl:`${site('still-water-yoga')}/classes`,
  address:'9 Mass Ave, Arlington',hours:['Daily 7-8'],team:[{name:'Mina Joshi',role:'Owner and teacher'}],imagery:noImages},
  devFeedback:[{rating:3,style:'paraphrase',notes:'Everything is squeezed together. Give it room to breathe.',expect:['spacing:more']}],
  feedback:[{rating:3,notes:'Calm subtle motion is right here. Needs more breathing room, it feels cramped. Love the serif headings.',expect:['spacing:more', 'typography:prefer:editorial-serif']}]},
 // ---------------- beauty
 {split:'train',imageSet:'universal',facts:{id:'fx-gloss-studio',name:'Gloss Hair Studio',industry:'beauty',city:'Brookline',
  about:'A four-chair salon specialising in color and curly cuts. Consultations are free.',
  offerings:['Color','Curly cuts','Balayage','Free consultations'],conversion:'book',conversionUrl:`${site('gloss-studio')}/book`,
  address:'1300 Beacon St, Brookline',hours:['Tue-Sat 10-7'],team:[{name:'Ana Silva',role:'Owner, colorist'},{name:'Keiko Ito',role:'Curl specialist'}],
  visualWork:true,imagery:authorized('gloss-studio',6)},
  devFeedback:[{rating:3,style:'paraphrase',notes:'I keep losing the book button when I scroll on my phone.',expect:['ctaStructure:prefer:sticky-bar']}],
  feedback:[{rating:2,notes:'Show more of the actual work, more photos. The booking button gets lost, make it sticky. Serif type is lovely.',expect:['imageryDensity:more', 'ctaStructure:prefer:sticky-bar']}]},
 {split:'train',imageSet:'universal',facts:{id:'fx-fern-nails',name:'Fernwood Nail Bar',industry:'beauty',city:'Needham',
  about:'A nail salon using non-toxic polishes, with walk-ins welcome on weekdays.',
  offerings:['Manicures','Pedicures','Gel extensions','Nail art'],conversion:'book',conversionUrl:`${site('fernwood-nails')}/book`,
  phone:'781-555-0114',address:'50 Chapel St, Needham',hours:['Mon-Sat 9-7'],visualWork:true,imagery:noImages},
  feedback:[{rating:3,notes:'More photos of nail work. Sticky booking button on mobile please.',expect:['imageryDensity:more', 'ctaStructure:prefer:sticky-bar']}]},
 // ---------------- creative
 {split:'train',imageSet:'universal',facts:{id:'fx-lumen-studio',name:'Lumen Architecture Studio',industry:'creative',city:'Cambridge',
  about:'A three-person architecture studio designing small houses, additions and adaptive reuse projects.',
  offerings:['Residential design','Additions','Adaptive reuse','Feasibility studies'],conversion:'contact',email:'studio@lumen-studio.example',
  process:['Site visit','Concept design','Permits','Construction support'],visualWork:true,imagery:authorized('lumen-studio',6)},
  feedback:[{rating:3,notes:'Asymmetric layout would suit an architect. Love the full-bleed project photos. Copy is too thin, explain the process more.',expect:['composition:prefer:asymmetric', 'copyDepth:more']}]},
 {split:'train',imageSet:'universal',facts:{id:'fx-ink-ferry',name:'Ink Ferry Press',industry:'creative',city:'Salem',
  about:'A letterpress print shop making wedding suites, business cards and short art editions.',
  offerings:['Wedding invitations','Business cards','Art prints','Custom editions'],conversion:'quote',conversionUrl:`${site('ink-ferry')}/quote`,
  email:'hello@ink-ferry.example',visualWork:true,imagery:noImages},
  devFeedback:[{rating:3,style:'paraphrase',notes:'Tiles on tiles on tiles. Break the grid.',expect:['composition:avoid:bento']}],
  feedback:[{rating:2,notes:'Cards everywhere, it looks like a template. More photos of the prints. Off-grid asymmetric layout please.',expect:['composition:avoid:bento', 'imageryDensity:more', 'composition:prefer:asymmetric']}]},
 // ---------------- home services
 {split:'train',imageSet:'landscaping',facts:{id:'fx-tidy-nest',name:'Tidy Nest Cleaning',industry:'home-services',city:'Newton',serviceMode:'on-site',
  about:'Recurring and move-out house cleaning by a bonded team of six.',
  offerings:['Recurring cleaning','Deep cleaning','Move-out cleaning','Fridge and oven add-ons'],conversion:'quote',conversionUrl:`${site('tidy-nest')}/quote`,
  phone:'617-555-0117',serviceArea:['Newton','Waltham','Watertown','Needham'],process:['Online quote','Walkthrough','First clean','Recurring schedule'],
  proof:['Bonded and insured','Background-checked staff'],imagery:noImages},
  devFeedback:[{rating:3,style:'paraphrase',notes:'Nobody wants to read an essay about cleaning. Trim the copy.',expect:['copyDepth:less']}],
  feedback:[{rating:2,notes:'Make the quote button sticky on phones. Too many generated photos, they look like stock. Too wordy.',expect:['ctaStructure:prefer:sticky-bar', 'imageryDensity:less', 'copyDepth:less']}]},
 {split:'train',imageSet:'landscaping',facts:{id:'fx-greenline-lawn',name:'Greenline Lawn Care',industry:'home-services',city:'Lexington',serviceMode:'on-site',
  about:'Weekly mowing, spring and fall cleanups, and organic lawn programs.',
  offerings:['Weekly mowing','Spring cleanup','Fall cleanup','Organic lawn program'],conversion:'quote',conversionUrl:`${site('greenline-lawn')}/quote`,
  phone:'781-555-0118',serviceArea:['Lexington','Bedford','Burlington'],imagery:authorized('greenline-lawn',3)},
  feedback:[{rating:3,notes:'Fewer photos would load faster. Sticky call bar on mobile. Green colors fit well, keep them.',expect:['imageryDensity:less', 'ctaStructure:prefer:sticky-bar', 'palette:prefer:forest']}]},
 // ---------------- education
 {split:'train',imageSet:'universal',facts:{id:'fx-bright-path',name:'Bright Path Tutoring',industry:'education',city:'Belmont',serviceMode:'mixed',audience:'families',
  about:'One-on-one math and writing tutoring for grades 6 to 12, in person or online.',
  offerings:['Math tutoring','Writing tutoring','SAT prep','Study skills'],conversion:'enroll',conversionUrl:`${site('bright-path')}/start`,
  email:'hello@bright-path.example',team:[{name:'Priya Raman',role:'Founder, math tutor'},{name:'Owen Price',role:'Writing tutor'}],
  process:['Free consult','Assessment','Weekly sessions','Progress reports'],imagery:noImages},
  feedback:[{rating:3,notes:'Too much text, trim it. Put the tutors and their background first. Motion is a little distracting.',expect:['copyDepth:less', 'hierarchy:prefer:proof-first', 'motionSystem:less']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-loom-school',name:'Loom & Shuttle Weaving School',industry:'education',city:'Lowell',
  about:'A weaving school with six-week beginner courses and open studio hours for members.',
  offerings:['Beginner weaving course','Open studio','Dyeing workshop'],conversion:'enroll',conversionUrl:`${site('loom-shuttle')}/courses`,
  address:'2 Mill St, Lowell',hours:['Wed-Sat 10-6'],visualWork:true,imagery:noImages},
  heldOutFeedback:[{rating:3,style:'client',notes:'My students always ask what the looms look like. Can people see the looms and the scarves our students made?',expect:['imageryDensity:more']}]},
 // ---------------- legal (holdout only)
 {split:'holdout',imageSet:'universal',facts:{id:'fx-ward-law',name:'Ward & Bell Law',industry:'legal',city:'Worcester',
  about:'A two-attorney firm handling estate planning and probate. First consultations are 30 minutes.',
  offerings:['Wills and trusts','Probate','Powers of attorney','Elder law'],conversion:'book',conversionUrl:`${site('ward-bell-law')}/consult`,
  phone:'508-555-0121',address:'100 Front St, Worcester',
  team:[{name:'Helen Ward, Esq.',role:'Partner'},{name:'Marcus Bell, Esq.',role:'Partner'}],proof:['Admitted to the Massachusetts bar','Member, estate planning section'],
  imagery:noImages},
  heldOutFeedback:[{rating:2,style:'designer',notes:'Open on attorney bios and bar admissions. Imagery is excessive for an estate practice. Kill the scroll effects.',expect:['hierarchy:prefer:proof-first', 'imageryDensity:less', 'motionSystem:less']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-ridgeview-clinic',name:'Ridgeview Legal Clinic',industry:'legal',city:'Lynn',audience:'vulnerable',
  about:'A nonprofit-priced legal clinic offering tenant and employment consultations on a sliding scale.',
  offerings:['Tenant consultations','Employment questions','Document review'],conversion:'call',phone:'781-555-0122',
  hours:['Mon-Thu 9-5'],address:'15 Union St, Lynn',proof:['Staff attorneys admitted in Massachusetts'],imagery:noImages},
  heldOutFeedback:[{rating:2,style:'client',notes:"Our clients are tenants who are scared. Please don't make it look like a fancy firm. Plain information, fewer pictures, and the phone number where they can see it.",expect:['imageryDensity:less', 'ctaStructure:prefer:sticky-bar']}]},
 // ---------------- nonprofit (holdout only)
 {split:'holdout',imageSet:'landscaping',facts:{id:'fx-river-trust',name:'Mystic Riverbank Trust',industry:'nonprofit',city:'Medford',
  about:'A volunteer group that restores riverbank habitat. Saturday planting days run from April to October.',
  offerings:['Volunteer planting days','School field trips','Native plant sale'],conversion:'donate',conversionUrl:`${site('riverbank-trust')}/donate`,
  email:'info@riverbank-trust.example',process:['Sign up','Get a site briefing','Plant and record'],visualWork:true,imagery:authorized('riverbank-trust',4)},
  heldOutFeedback:[{rating:3,style:'emotional',notes:'We are all about the river and our amazing volunteers and I want people to SEE them!! And please, the donate button has to follow people as they scroll on their phones.',expect:['imageryDensity:more', 'ctaStructure:prefer:sticky-bar']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-open-shelf',name:'Open Shelf Food Pantry',industry:'nonprofit',city:'Chelsea',audience:'vulnerable',
  about:'A neighborhood food pantry open twice a week, no documentation required.',
  offerings:['Weekly groceries','Fresh produce','Volunteer shifts'],conversion:'donate',conversionUrl:`${site('open-shelf')}/give`,
  address:'4 Broadway, Chelsea',hours:['Tue 3-7','Sat 9-12'],imagery:noImages},
  heldOutFeedback:[{rating:3,style:'adversarial',notes:"I don't hate the layout. It isn't too wordy either. The photos are fine, I guess.",expect:[]}]},
 // ---------------- financial (holdout only)
 {split:'holdout',imageSet:'universal',facts:{id:'fx-ledger-lane',name:'Ledger Lane Tax & Books',industry:'financial',city:'Dedham',
  about:'Tax preparation and monthly bookkeeping for households and small businesses.',
  offerings:['Individual tax returns','Small-business bookkeeping','Payroll setup','IRS notice help'],conversion:'book',conversionUrl:`${site('ledger-lane')}/book`,
  phone:'781-555-0124',team:[{name:'Rosa Delgado, CPA',role:'Owner'}],proof:['Certified public accountant','Enrolled with the IRS e-file program'],
  process:['Intro call','Document checklist','Preparation','Review and file'],imagery:noImages},
  heldOutFeedback:[{rating:2,style:'adversarial',notes:'Oh great, another wall of text. Nobody reads paragraphs about bookkeeping. And stock photos of calculators? Really?',expect:['copyDepth:less', 'imageryDensity:less']}]},
 // ---------------- unusual (holdout only)
 {split:'holdout',imageSet:'universal',facts:{id:'fx-tick-tock',name:'Tick & Tock Clock Repair',industry:'unusual',city:'Newburyport',
  about:'A one-person workshop repairing mechanical clocks and restoring antique movements. House calls for tall case clocks.',
  offerings:['Mechanical clock repair','Antique restoration','Tall case clock house calls'],conversion:'call',phone:'978-555-0125',
  address:'3 Water St, Newburyport',hours:['Wed-Sat 10-4'],visualWork:true,imagery:noImages}},
 {split:'holdout',imageSet:'landscaping',facts:{id:'fx-hive-supply',name:'Queen Bee Apiary Supply',industry:'unusual',city:'Harvard',
  about:'A beekeeping supply barn selling hives, tools and local bees, with beginner classes each spring.',
  offerings:['Hive kits','Package bees','Beekeeping classes','Honey extraction rental'],conversion:'visit',phone:'978-555-0126',
  address:'Old Mill Rd, Harvard',hours:['Sat-Sun 9-3, Mar-Oct'],process:['Take the beginner class','Order a package','Pick up in April'],visualWork:true,imagery:noImages},
  heldOutFeedback:[{rating:3,style:'terse',notes:'seasonal hours first. pics of hives.',expect:['hierarchy:prefer:action-first', 'imageryDensity:more']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-edge-mobile',name:'Keen Edge Mobile Sharpening',industry:'unusual',city:'Boston',serviceMode:'on-site',
  about:'A van-based knife and tool sharpening service visiting farmers markets and restaurants.',
  offerings:['Kitchen knife sharpening','Garden tool sharpening','Restaurant accounts'],conversion:'call',phone:'617-555-0127',
  serviceArea:['Boston','Cambridge','Somerville','Brookline'],urgent:false,imagery:noImages},
  heldOutFeedback:[{rating:3,style:'terse',notes:'phone # sticky on mobile. no stock pics.',expect:['ctaStructure:prefer:sticky-bar', 'imageryDensity:less']}]},
 // ---------------- hospitality (one train, one holdout)
 {split:'train',imageSet:'landscaping',facts:{id:'fx-linden-house',name:'The Linden House',industry:'hospitality',city:'Concord',
  about:'A seven-room inn in an 1840s farmhouse with a walled garden. Breakfast is served daily and the garden hosts small weddings.',
  offerings:['Guest rooms','Garden weddings','Breakfast','Private dinners'],conversion:'book',conversionUrl:`${site('linden-house')}/reserve`,
  phone:'978-555-0131',address:'21 Lowell Rd, Concord',faq:[{q:'Is there parking?',a:'Yes, behind the barn.'}],visualWork:true,
  imagery:{...authorized('linden-house',5),businessImages:authorized('linden-house',5).businessImages.map((im,i)=>i===4?{...im,quality:'low' as const}:im)}},
  feedback:[{rating:3,notes:'More photos of the rooms and the garden. Warm colors fit an inn. The booking button should stay on screen on phones.',expect:['imageryDensity:more', 'palette:prefer:clay', 'ctaStructure:prefer:sticky-bar']}]},
 {split:'holdout',imageSet:'landscaping',facts:{id:'fx-saltbox-inn',name:'Saltbox Inn',industry:'hospitality',city:'Rockport',
  about:'A five-room inn steps from the harbor, open April to December. Rooms have harbor or garden views.',
  offerings:['Harbor-view rooms','Garden rooms','Continental breakfast'],conversion:'book',conversionUrl:`${site('saltbox-inn')}/rooms`,
  address:'3 Bearskin Neck, Rockport',hours:['Check-in 3-8','Check-out by 11'],visualWork:true,imagery:authorized('saltbox-inn',4)},
  heldOutFeedback:[{rating:2,style:'emotional',notes:'It is a cozy little inn!! Right now it feels cold and corporate. Warmer colors please, and let people actually see the rooms.',expect:['palette:prefer:clay','imageryDensity:more']}]},
 // ---------------- automotive (holdout only)
 {split:'holdout',imageSet:'universal',facts:{id:'fx-brakes-more',name:'Brakes & More Auto Care',industry:'automotive',city:'Waltham',
  about:'An independent repair shop for brakes, suspension and inspections. Same-day diagnostics when the bay is open.',
  offerings:['Brake repair','Suspension','State inspections','Same-day diagnostics'],conversion:'call',phone:'781-555-0132',
  address:'400 Main St, Waltham',hours:['Mon-Fri 7:30-5:30','Sat 8-12'],proof:['ASE certified technicians','Massachusetts inspection station'],
  urgent:true,imagery:noImages},
  heldOutFeedback:[{rating:2,style:'client',notes:'People find us when their car dies on the highway. The phone number has to be impossible to miss on a phone. We do not need the artsy photos.',expect:['ctaStructure:prefer:sticky-bar','imageryDensity:less']}]},
 {split:'holdout',imageSet:'universal',facts:{id:'fx-mirror-finish',name:'Mirror Finish Detailing',industry:'automotive',city:'Burlington',
  about:'Paint correction, ceramic coating and interior detailing by appointment, at the shop or at your driveway.',
  offerings:['Paint correction','Ceramic coating','Interior detailing','Mobile detailing'],conversion:'quote',conversionUrl:`${site('mirror-finish')}/quote`,
  phone:'781-555-0133',serviceMode:'mixed',serviceArea:['Burlington','Woburn','Lexington'],visualWork:true,imagery:authorized('mirror-finish',6)},
  heldOutFeedback:[{rating:3,style:'designer',notes:'This is a before-and-after business; the work should carry the page. The type feels timid, push the weight.',expect:['imageryDensity:more','typography:prefer:grotesk-display']}]},
];

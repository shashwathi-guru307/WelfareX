// Tamil Nadu Welfare Boards & Nature of Works
// Data sourced from TN Welfare Boards and Nature of Works Directory

export interface WelfareBoardData {
  name: string;
  shortName: string;
  /** Keywords used to match this board against DB board names (e.g. "Tamil Nadu ..." vs "TN ...") */
  keywords: string[];
  natureOfWorks: { code: string; name: string }[];
}

function normalizeBoardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\btamil nadu\b|\btn\b|\bwelfare board\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/**
 * Match a welfare board name from the database against the static board
 * directory, tolerating naming differences such as "Tamil Nadu X Welfare
 * Board" vs "TN X Welfare Board" or variant spellings. Falls back to
 * keyword matching so every DB board resolves to its nature-of-work list.
 */
export function findBoardDataByName(dbBoardName?: string | null): WelfareBoardData | undefined {
  if (!dbBoardName) return undefined;
  const norm = normalizeBoardName(dbBoardName);
  let best: WelfareBoardData | undefined;
  let bestScore = 0;
  for (const board of WELFARE_BOARDS_DATA) {
    const bNorm = normalizeBoardName(board.name);
    let score = 0;
    if (bNorm === norm) {
      score = 1000;
    } else if (bNorm.includes(norm) || norm.includes(bNorm)) {
      score = 500 + bNorm.length;
    }
    for (const kw of board.keywords) {
      if (norm.includes(normalizeBoardName(kw))) score = Math.max(score, kw.length * 10);
    }
    if (score > bestScore) {
      bestScore = score;
      best = board;
    }
  }
  return best;
}

export const WELFARE_BOARDS_DATA: WelfareBoardData[] = [
  {
    name: 'TN Construction Workers Welfare Board',
    shortName: 'Construction WWB',
    keywords: ['construction'],
    natureOfWorks: [
      { code: 'PWTL', name: 'Construction of public parks, walking tracks and landscaping' },
      { code: 'BEND', name: 'Fitter including bar bender' },
      { code: 'PMBR', name: 'Plumber for road pipe work' },
      { code: 'ELCT', name: 'Electrician' },
      { code: 'MECH', name: 'Mechanic' },
      { code: 'WELL', name: 'Well sinker' },
      { code: 'HDMZ', name: 'Head mazdoor' },
      { code: 'MZDR', name: 'Mazdoor' },
      { code: 'SPRY', name: 'Sprayman or mixerman (road surfacing)' },
      { code: 'WELD', name: 'Welder' },
      { code: 'PACK', name: 'Wooden or stone packer' },
      { code: 'MXDR', name: 'Mixer driver' },
      { code: 'SILT', name: 'Well diver for removing silt' },
      { code: 'HAMR', name: 'Hammer man' },
      { code: 'THAT', name: 'Thatcher' },
      { code: 'FFSM', name: 'Installation and repair of fire fighting systems' },
      { code: 'MSTY', name: 'Maistry' },
      { code: 'COHE', name: 'Installation and repair of cooling and heating systems' },
      { code: 'BLAK', name: 'Blacksmith' },
      { code: 'LIES', name: 'Installation of lifts and escalators' },
      { code: 'SAWR', name: 'Sawer' },
      { code: 'SGDS', name: 'Installation of security gates and devices' },
      { code: 'CAUK', name: 'Caulker' },
      { code: 'IGWD', name: 'Fabrication and installation of iron / metal grills, windows and doors' },
      { code: 'MIXR', name: 'Mixer (including concrete mixer operator)' },
      { code: 'WHVS', name: 'Construction of water harvesting structures' },
      { code: 'PUMP', name: 'Pump operator' },
      { code: 'CFCP', name: 'Interior work including carpeting, false ceiling, lighting and plaster of paris' },
      { code: 'ROLR', name: 'Roller driver' },
      { code: 'CGGP', name: 'Cutting, glazing and installation of glass panels' },
      { code: 'KALS', name: 'Kalasis or Sarang engaged in heavy engineering construction like heavy machinery, bridge work etc.' },
      { code: 'EESP', name: 'Installation of energy efficient equipment like solar panels' },
      { code: 'WATH', name: 'Watchman' },
      { code: 'MOKN', name: 'Installation of modular units for use in places such as kitchens' },
      { code: 'MSIC', name: 'Mosaic polisher' },
      { code: 'PFCM', name: 'Making and installation of pre-fabricated concrete modules' },
      { code: 'TUNL', name: 'Tunnel worker' },
      { code: 'SPGC', name: 'Construction of sports and recreation facilities including swimming pools, golf courses' },
      { code: 'MRBL', name: 'Marble / kadapa stone worker' },
      { code: 'ESRS', name: 'Construction or erection of signage, road furniture, bus shelters / depots / stands and signalling systems' },
      { code: 'ROAD', name: 'Road worker' },
      { code: 'ROFN', name: 'Construction of rotaries and installation of fountains' },
      { code: 'ROCK', name: 'Rock breaker and quarry worker' },
      { code: 'ERTH', name: 'Earth worker connected with construction work' },
      { code: 'LIME', name: 'Worker engaged in processing lime' },
      { code: 'SEAE', name: 'Worker engaged in anti sea erosion work' },
      { code: 'STON', name: 'Stone cutter or breaker or stone crusher' },
      { code: 'OTHR', name: 'Any other category of workers who are actually engaged in the employment of construction or maintenance of dams, bridges, roads, or in any building operation.' },
      { code: 'MSON', name: 'Mason or brick layer' },
      { code: 'CARP', name: 'Carpenter' },
      { code: 'BRIK', name: 'Brick manufactory other than the brick manufactory under the factories act, 1948 (central act 63 of 1948)' },
      { code: 'PNTR', name: 'Painter or varnisher' },
      { code: 'PNDL', name: 'Employment in Construction of Pandals' },
      { code: 'DEMN', name: 'Demolition worker engaged in dams, bridges, roads or any other building' },
    ],
  },
  {
    name: 'TN Manual Workers Social Security and Welfare Board',
    shortName: 'Manual Workers SWB',
    keywords: ['manual workers', 'social security'],
    natureOfWorks: [
      { code: 'WOWO', name: 'Wood Working Units' },
      { code: 'FOPR', name: 'Collection of Forest Produce' },
      { code: 'CYRE', name: 'Cycle Repairing' },
      { code: 'CIGR', name: 'Cigar Manufacture' },
      { code: 'CASH', name: 'Cashewnut Industry' },
      { code: 'VIPH', name: 'Video & Photography' },
      { code: 'CYCL', name: 'Driving Cycle Rickshaws' },
      { code: 'SDLT', name: 'Sound & Light Service' },
      { code: 'ENGR', name: 'Engineering Works' },
      { code: 'ELSR', name: 'Repair & Servicing of Electronic Goods & Equipments' },
      { code: 'WASI', name: 'Warping and Sizing' },
      { code: 'FOTG', name: 'Folding Textiles Goods' },
      { code: 'GUNI', name: 'Gunny Industry' },
      { code: 'INCS', name: 'Incense sticks manufactory' },
      { code: 'LPGC', name: 'Distribution of Liquid Petroleum Gas Cylinders' },
      { code: 'NIBG', name: 'Nib making' },
      { code: 'FORD', name: 'Flour Mills, Oil Mills, Dhall Mills and Rice Mills' },
      { code: 'PRPR', name: 'Printing Presses' },
      { code: 'PASS', name: 'Private Security Services' },
      { code: 'PLID', name: 'Plastic Industries' },
      { code: 'RAPI', name: 'Rag-picking' },
      { code: 'LULC', name: 'Loading / Unloading in shops & establishments (கடைகள் நிறுவனங்களில் சுமை ஏற்றுதல்)' },
      { code: 'LULT', name: 'Loading / Unloading in public sector transport vehicles (பொதுத்துறை வாகனத்தில் சுமை ஏற்றுதல்)' },
      { code: 'LULF', name: 'Handling and sorting grains in food storage godowns (உணவு சேமிப்பு கிடங்கில் தானியங்களை கையாளுதல் வகை பிரித்தல்)' },
      { code: 'SALT', name: 'Salt pans' },
      { code: 'BOAT', name: 'Boat working' },
      { code: 'TMBR', name: 'Timber industry' },
      { code: 'COIR', name: 'Coir industry' },
      { code: 'SAGO', name: 'Sago Industry' },
      { code: 'APLM', name: 'Appalam Manufactory' },
      { code: 'SYGM', name: 'Synthetic Gem Cutting' },
      { code: 'BLDY', name: 'Bleaching and Dyeing' },
      { code: 'SRCE', name: 'Sericulture' },
      { code: 'BKCD', name: 'Bullock Cart Driving' },
      { code: 'TINC', name: 'Tin Containers Manufactory' },
      { code: 'COPL', name: 'Coconut Peeling' },
      { code: 'TOUR', name: 'Employment in tourism related works' },
      { code: 'GIGW', name: 'Online based GIG works' },
    ],
  },
  {
    name: 'TN Washermen Welfare Board',
    shortName: 'Washermen WB',
    keywords: ['washermen', 'laundry'],
    natureOfWorks: [
      { code: 'LAWA', name: 'Laundries and Washing Clothes' },
    ],
  },
  {
    name: 'TN Hair Dressers Welfare Board',
    shortName: 'Hair Dressers WB',
    keywords: ['hair'],
    natureOfWorks: [
      { code: 'HRBP', name: 'Hair Dressing and Beauty Parlour' },
    ],
  },
  {
    name: 'TN Tailoring Workers Welfare Board',
    shortName: 'Tailoring WWB',
    keywords: ['tailor'],
    natureOfWorks: [
      { code: 'TAIL', name: 'Tailoring' },
    ],
  },
  {
    name: 'TN Handicraft Workers Welfare Board',
    shortName: 'Handicraft WWB',
    keywords: ['handicraft', 'sculpture', 'vessels'],
    natureOfWorks: [
      { code: 'VEMA', name: 'Vessels Manufactory' },
      { code: 'SCLP', name: 'Sculpture' },
      { code: 'HAND', name: 'Handicraft' },
    ],
  },
  {
    name: 'TN Palm Tree Workers Welfare Board',
    shortName: 'Palm Tree WWB',
    keywords: ['palm'],
    natureOfWorks: [
      { code: 'NEET', name: 'Neera Tapping' },
      { code: 'TREE', name: 'Tree Climbing' },
    ],
  },
  {
    name: 'TN Handloom and Handloom Silk Weaving Workers Welfare Board',
    shortName: 'Handloom HHSW WWB',
    keywords: ['handloom'],
    natureOfWorks: [
      { code: 'HHSW', name: 'Handlooms and hand-looms silk weaving' },
    ],
  },
  {
    name: 'TN Footwear and Leather Goods Manufactory and Tannery Workers Welfare Board',
    shortName: 'Footwear & Leather WWB',
    keywords: ['footwear', 'leather', 'tannery'],
    natureOfWorks: [
      { code: 'TALE', name: 'Tanneries and leather manufacture factory' },
      { code: 'FLGM', name: 'Footwear and leather goods manufactory' },
    ],
  },
  {
    name: 'TN Artists Welfare Board',
    shortName: 'Artists WB',
    keywords: ['artist'],
    natureOfWorks: [
      { code: 'ARTS', name: 'Artists' },
    ],
  },
  {
    name: 'TN Goldsmiths Welfare Board',
    shortName: 'Goldsmiths WB',
    keywords: ['goldsmith', 'gold'],
    natureOfWorks: [
      { code: 'GSAM', name: 'Gold and Silver Manufacture Factory' },
    ],
  },
  {
    name: 'TN Pottery Workers Welfare Board',
    shortName: 'Pottery WWB',
    keywords: ['pottery'],
    natureOfWorks: [
      { code: 'POWO', name: 'Pottery Works' },
    ],
  },
  {
    name: 'TN Domestic Workers Welfare Board',
    shortName: 'Domestic WWB',
    keywords: ['domestic'],
    natureOfWorks: [
      { code: 'DOME', name: 'Domestic Work' },
    ],
  },
  {
    name: 'TN Power loom Weaving Workers Welfare Board',
    shortName: 'Power loom WWB',
    keywords: ['power loom', 'powerloom'],
    natureOfWorks: [
      { code: 'PRLI', name: 'Powerloom weaving workers' },
    ],
  },
  {
    name: 'TN Street Vending and Shops and Establishments Workers Welfare Board',
    shortName: 'Street Vending WWB',
    keywords: ['street vend', 'shops and establishments'],
    natureOfWorks: [
      { code: 'STVE', name: 'Street Vending' },
      { code: 'SOES', name: 'Shops and establishments' },
    ],
  },
  {
    name: 'TN Cooking and Catering Workers Welfare Board',
    shortName: 'Cooking & Catering WWB',
    keywords: ['cooking', 'catering'],
    natureOfWorks: [
      { code: 'CATR', name: 'Catering Establishments' },
      { code: 'COOK', name: 'Cooking Food' },
    ],
  },
  {
    name: 'TN Unorganised Drivers and Automobile Workshop Workers Welfare Board',
    shortName: 'Drivers & Auto WWB',
    keywords: ['automobile', 'driver', 'auto rickshaw'],
    natureOfWorks: [
      { code: 'AUWO', name: 'Automobile Workshop' },
      { code: 'AUTO', name: 'Driving Auto rickshaws and taxi' },
    ],
  },
  {
    name: 'TN Beedi Workers Welfare Board',
    shortName: 'Beedi WB',
    keywords: ['beedi'],
    natureOfWorks: [
      { code: 'BEDR', name: 'Beedi Rolling' },
      { code: 'TOBW', name: 'Tobacco and Beedi Works' },
    ],
  },
  {
    name: 'TN Fire and Match Workers Welfare Board',
    shortName: 'Fire & Match WB',
    keywords: ['fire', 'match'],
    natureOfWorks: [
      { code: 'MAFW', name: 'Fire and Match Works' },
    ],
  },
];

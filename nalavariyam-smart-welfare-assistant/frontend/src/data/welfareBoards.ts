// Tamil Nadu Welfare Boards & Nature of Works
// Data sourced from TN Welfare Boards and Nature of Works Directory

export interface WelfareBoardData {
  name: string;
  shortName: string;
  natureOfWorks: { code: string; name: string }[];
}

export const WELFARE_BOARDS_DATA: WelfareBoardData[] = [
  {
    name: 'TN Construction Workers Welfare Board',
    shortName: 'Construction WWB',
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
      { code: 'IGWD', name: 'Fabrication and installation of iron/metal grills, windows and doors' },
      { code: 'MIXR', name: 'Mixer (including concrete mixer operator)' },
      { code: 'WHVS', name: 'Construction of water harvesting structures' },
      { code: 'PUMP', name: 'Pump operator' },
      { code: 'CFCP', name: 'Interior work including carpeting, false ceiling, lighting and plaster of paris' },
      { code: 'ROLR', name: 'Roller driver' },
      { code: 'CGGP', name: 'Cutting, glazing and installation of glass panels' },
      { code: 'KALS', name: 'Kalasis or Sarang engaged in heavy engineering construction' },
      { code: 'EESP', name: 'Installation of energy efficient equipment like solar panels' },
      { code: 'WATH', name: 'Watchman' },
      { code: 'MOKN', name: 'Installation of modular units for use in places such as kitchens' },
      { code: 'MSIC', name: 'Mosaic polisher' },
      { code: 'PFCM', name: 'Making and installation of pre-fabricated concrete modules' },
      { code: 'TUNL', name: 'Tunnel worker' },
      { code: 'SPGC', name: 'Construction of sports and recreation facilities including swimming pools' },
      { code: 'MRBL', name: 'Marble / kadapa stone worker' },
      { code: 'ESRS', name: 'Construction or erection of signage, road furniture, bus shelters' },
      { code: 'ROAD', name: 'Road worker' },
      { code: 'ROFN', name: 'Construction of rotaries and installation of fountains' },
      { code: 'ROCK', name: 'Rock breaker and quarry worker' },
      { code: 'ERTH', name: 'Earth worker connected with construction work' },
      { code: 'LIME', name: 'Worker engaged in processing lime' },
      { code: 'SEAE', name: 'Worker engaged in anti sea erosion work' },
      { code: 'STON', name: 'Stone cutter or breaker or stone crusher' },
      { code: 'OTHR', name: 'Any other category of workers engaged in construction or maintenance' },
      { code: 'MSON', name: 'Mason or brick layer' },
      { code: 'CARP', name: 'Carpenter' },
      { code: 'BRIK', name: 'Brick manufactory' },
      { code: 'PNTR', name: 'Painter or varnisher' },
      { code: 'PNDL', name: 'Employment in Construction of Pandals' },
      { code: 'DEMN', name: 'Demolition worker engaged in dams, bridges, roads or any other building' },
    ],
  },
  {
    name: 'TN Manual Workers Social Security and Welfare Board',
    shortName: 'Manual Workers SWB',
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
      { code: 'LULC', name: 'Loading / Unloading in shops & establishments' },
      { code: 'LULT', name: 'Loading / Unloading in public sector transport vehicles' },
      { code: 'LULF', name: 'Handling and sorting grains in food storage godowns' },
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
    natureOfWorks: [
      { code: 'LAWA', name: 'Laundries and Washing Clothes' },
    ],
  },
  {
    name: 'TN Hair Dressers Welfare Board',
    shortName: 'Hair Dressers WB',
    natureOfWorks: [
      { code: 'HRBP', name: 'Hair Dressing and Beauty Parlour' },
    ],
  },
  {
    name: 'TN Tailoring Workers Welfare Board',
    shortName: 'Tailoring WWB',
    natureOfWorks: [
      { code: 'TAIL', name: 'Tailoring' },
    ],
  },
  {
    name: 'TN Handicraft Workers Welfare Board',
    shortName: 'Handicraft WWB',
    natureOfWorks: [
      { code: 'VEMA', name: 'Vessels Manufactory' },
      { code: 'SCLP', name: 'Sculpture' },
      { code: 'HAND', name: 'Handicraft' },
    ],
  },
  {
    name: 'TN Palm Tree Workers Welfare Board',
    shortName: 'Palm Tree WWB',
    natureOfWorks: [
      { code: 'NEET', name: 'Neera Tapping' },
      { code: 'TREE', name: 'Tree Climbing' },
    ],
  },
  {
    name: 'TN Handloom and Handloom Silk Weaving Workers Welfare Board',
    shortName: 'Handloom HHSW WWB',
    natureOfWorks: [
      { code: 'HHSW', name: 'Handlooms and hand-looms silk weaving' },
    ],
  },
  {
    name: 'TN Footwear and Leather Goods Manufactory and Tannery Workers Welfare Board',
    shortName: 'Footwear & Leather WWB',
    natureOfWorks: [
      { code: 'TALE', name: 'Tanneries and leather manufacture factory' },
      { code: 'FLGM', name: 'Footwear and leather goods manufactory' },
    ],
  },
  {
    name: 'TN Artists Welfare Board',
    shortName: 'Artists WB',
    natureOfWorks: [
      { code: 'ARTS', name: 'Artists' },
    ],
  },
  {
    name: 'TN Goldsmiths Welfare Board',
    shortName: 'Goldsmiths WB',
    natureOfWorks: [
      { code: 'GSAM', name: 'Gold and Silver Manufacture Factory' },
    ],
  },
  {
    name: 'TN Pottery Workers Welfare Board',
    shortName: 'Pottery WWB',
    natureOfWorks: [
      { code: 'POWO', name: 'Pottery Works' },
    ],
  },
  {
    name: 'TN Domestic Workers Welfare Board',
    shortName: 'Domestic WWB',
    natureOfWorks: [
      { code: 'DOME', name: 'Domestic Work' },
    ],
  },
  {
    name: 'TN Power loom Weaving Workers Welfare Board',
    shortName: 'Power loom WWB',
    natureOfWorks: [
      { code: 'PRLI', name: 'Powerloom weaving workers' },
    ],
  },
  {
    name: 'TN Street Vending and Shops and Establishments Workers Welfare Board',
    shortName: 'Street Vending WWB',
    natureOfWorks: [
      { code: 'STVE', name: 'Street Vending' },
      { code: 'SOES', name: 'Shops and establishments' },
    ],
  },
  {
    name: 'TN Cooking and Catering Workers Welfare Board',
    shortName: 'Cooking & Catering WWB',
    natureOfWorks: [
      { code: 'CATR', name: 'Catering Establishments' },
      { code: 'COOK', name: 'Cooking Food' },
    ],
  },
  {
    name: 'TN Unorganised Drivers and Automobile Workshop Workers Welfare Board',
    shortName: 'Drivers & Auto WWB',
    natureOfWorks: [
      { code: 'AUWO', name: 'Automobile Workshop' },
      { code: 'AUTO', name: 'Driving Auto rickshaws and taxi' },
    ],
  },
  {
    name: 'TN Fire and Match Workers Welfare Board',
    shortName: 'Fire & Match WB',
    natureOfWorks: [
      { code: 'MAFW', name: 'Fire and Match Works' },
    ],
  },
];

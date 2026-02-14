// ===== App =====
const APP_VERSION = '3.1';

// ===== Data =====
const DATA_URL =
  'https://raw.githubusercontent.com/wispborne/StarsectorModRepo/refs/heads/main/ModRepo.json';

// ===== Link Mappings =====
const LINK_ICONS = {
  Forum: 'forum',
  Discord: 'chat',
  DirectDownload: 'download',
  DownloadPage: 'open_in_new',
  NexusMods: 'storefront',
};

const LINK_LABELS = {
  Forum: 'Forum',
  Discord: 'Discord',
  DirectDownload: 'Download',
  DownloadPage: 'Website',
  NexusMods: 'NexusMods',
};

// ===== Author Aliases =====
const MOD_AUTHOR_ALIASES = [
  ["RustyCabbage", "rubi", "ceruleanpancake"],
  ["Wisp", "Wispborne", "Tartiflette and Wispborne"],
  ["DesperatePeter", "Jannes"],
  ["shoi", "gettag"],
  ["Dark.Revenant", "DR"],
  ["LazyWizard", "Lazy"],
  ["Techpriest", "Timid"],
  ["Nick XR", "Nick", "nick7884"],
  ["PMMeCuteBugPhotos", "MrFluffster"],
  ["Dazs", "Spiritfox", "spiritfox_"],
  ["Histidine, Zaphide", "Histidine", "histidine_my"],
  ["Snrasha", "Snrasha, the tinkerer"],
  ["Hotpics", "jackwolfskin"],
  ["cptdash", "SpeedRacer"],
  ["Elseud", "Elseudo"],
  ["TobiaF", "Toby"],
  ["Mephyr", "Liral"],
  ["Tranquility", "tranquil_light"],
  ["FasterThanSleepyfish", "Sleepyfish"],
  ["Nerzhull_AI", "nerzhulai"],
  ["theDrag", "theDragn", "iryx"],
  ["Audax", "Audaxl"],
  ["Pogre", "noof"],
  ["lord_dalton", "Epta Consortium"],
  ["hakureireimu", "LngA7Gw"],
  ["Nes", "nescom"],
  ["float", "this_is_a_username"],
  ["AERO", "aero.assault"],
  ["Fellout", "felloutwastaken"],
  ["Mr. THG", "thog"],
  ["Derelict_Surveyor", "jdt15"],
  ["constat.", "Astarat", "Astarat and PureTilt"],
  ["Soren", "S\u00f8ren", "Harmful Mechanic"],
];

// ===== Version Aliases =====
const VERSION_ALIASES = {
  '0.9.5': '0.95',
};

// ===== LocalStorage Keys =====
const LS_VIEW = 'sm3-view';
const LS_CARD_SIZE = 'sm3-cardSize';
const LS_SORT = 'sm3-sort';
const LS_CUSTOM_DATA = 'sm3-customData';

// ===== Defaults =====
const DEFAULT_VIEW = 'grid';
const DEFAULT_CARD_SIZE = 300;
const DEFAULT_SORT = 'name-asc';

// ===== Filtering =====
const MIN_VERSION_MOD_COUNT = 3;
const SEARCH_DEBOUNCE_MS = 300;

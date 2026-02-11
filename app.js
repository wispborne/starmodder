// ===== Version Comparison (ported from Dart) =====

const _groupingRegex = /(\d+|[a-zA-Z]+|[-\.]+)/g;
const _sepRegex = /[\s\-\u2013_]+/g;
const _isLetterRegex = /[a-zA-Z]/;

const _suffixOrder = ['dev', 'prerelease', 'preview', 'pre', 'alpha', 'beta', 'rc'];
const _suffixRank = {};
for (let i = 0; i < _suffixOrder.length; i++) _suffixRank[_suffixOrder[i]] = i;

function _tokenize(s) {
  const matches = [];
  let m;
  const re = new RegExp(_groupingRegex.source, 'g');
  while ((m = re.exec(s)) !== null) matches.push(m[0]);
  return matches;
}

function _normalizeSeparators(s) {
  return s.replace(_sepRegex, '.');
}

function _normalizeAndSplitTokens(aTokens, bTokens) {
  const aResult = [];
  const bResult = [];
  const len = Math.max(aTokens.length, bTokens.length);

  for (let i = 0; i < len; i++) {
    let aPart = i < aTokens.length ? aTokens[i] : '';
    let bPart = i < bTokens.length ? bTokens[i] : '';

    const aIsNumber = /^\d+$/.test(aPart);
    const bIsNumber = /^\d+$/.test(bPart);
    const aIsLetter = _isLetterRegex.test(aPart);
    const bIsLetter = _isLetterRegex.test(bPart);

    if (aIsLetter && bIsNumber) {
      aResult.push('0');
    } else if (bIsLetter && aIsNumber) {
      bResult.push('0');
    } else if (aPart === '' && bIsNumber) {
      aPart = '0';
    } else if (bPart === '' && aIsNumber) {
      bPart = '0';
    } else if (aPart === '' && bPart === '.') {
      aPart = '.';
    } else if (bPart === '' && aPart === '.') {
      bPart = '.';
    } else if (aPart === '' && bIsLetter) {
      // noop
    } else if (bPart === '' && aIsLetter) {
      // noop
    } else if (aPart === '' && bPart !== '') {
      aPart = bPart;
    } else if (bPart === '' && aPart !== '') {
      bPart = aPart;
    }

    aResult.push(aPart);
    bResult.push(bPart);
  }

  return [aResult, bResult];
}

function compareVersions(a, b) {
  if (a === b) return 0;
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const aOriginal = a;
  const bOriginal = b;
  const aPartsOriginal = _tokenize(a);
  const bPartsOriginal = _tokenize(b);

  a = _normalizeSeparators(a);
  b = _normalizeSeparators(b);

  const aTokens = _tokenize(a);
  const bTokens = _tokenize(b);
  const [aParts, bParts] = _normalizeAndSplitTokens(aTokens, bTokens);

  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const aPart = i < aParts.length ? aParts[i] : '';
    const bPart = i < bParts.length ? bParts[i] : '';

    const aIsNumber = /^\d+$/.test(aPart);
    const bIsNumber = /^\d+$/.test(bPart);

    if (aIsNumber && bIsNumber) {
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (aNum !== bNum) return aNum > bNum ? 1 : -1;
    } else if (aIsNumber && !bIsNumber) {
      return 1;
    } else if (!aIsNumber && bIsNumber) {
      return -1;
    } else {
      const aLow = aPart.toLowerCase();
      const bLow = bPart.toLowerCase();
      const ai = _suffixRank[aLow];
      const bi = _suffixRank[bLow];

      if (ai !== undefined && bi !== undefined) {
        if (ai !== bi) return ai > bi ? 1 : -1;
      } else if (ai !== undefined) {
        return -1;
      } else if (bi !== undefined) {
        return 1;
      }

      if (aPart !== bPart) {
        const cmp = aPart < bPart ? -1 : 1;
        return cmp;
      }
    }
  }

  const lenCmp = aPartsOriginal.length - bPartsOriginal.length;
  if (lenCmp !== 0) return lenCmp > 0 ? 1 : -1;

  if (aOriginal < bOriginal) return -1;
  if (aOriginal > bOriginal) return 1;
  return 0;
}

// ===== Version Normalization =====

function normalizeBaseVersion(rawVersion) {
  if (!rawVersion) return '';
  // Strip all non-version characters (keep digits, dots, hyphens)
  let s = rawVersion.replace(/[^0-9.\-]/g, '');
  // Split by hyphen, take first part (drops RC suffix like -RC12)
  s = s.split('-')[0];
  // Split by dot, filter empty, rejoin
  const parts = s.split('.').filter((p) => p.length > 0);
  let base = parts.join('.');
  // Apply hardcoded equivalences
  if (VERSION_ALIASES[base]) base = VERSION_ALIASES[base];
  return base;
}

// Map from normalized base version to Set of raw version strings
let normalizedVersionMap = new Map();

// ===== Category Normalization =====

const _noiseWords = new Set(['mods', 'mod', 'pack', 'packs']);

function categoryKey(raw) {
  if (!raw) return '';
  let s = raw;
  // Strip leading bracketed text like [0.98a]
  s = s.replace(/^\[[^\]]*\]\s*/, '');
  // Lowercase
  s = s.toLowerCase();
  // Replace separators (/ . -) with spaces
  s = s.replace(/[\/.\-]/g, ' ');
  // Collapse whitespace and trim
  s = s.replace(/\s+/g, ' ').trim();
  // Split into words and strip trailing noise words
  const words = s.split(' ');
  while (words.length > 1 && _noiseWords.has(words[words.length - 1])) {
    words.pop();
  }
  // Depluralize the last word (simple heuristic)
  if (words.length > 0) {
    let last = words[words.length - 1];
    if (last.endsWith('ies') && last.length > 4) {
      last = last.slice(0, -3) + 'y';
    } else if (last.endsWith('s') && !last.endsWith('ss') && last.length >= 4) {
      last = last.slice(0, -1);
    }
    words[words.length - 1] = last;
  }
  return words.join(' ');
}

function normalizeCategories(items) {
  // 1. Count frequency of each raw category
  const freq = new Map();
  for (const item of items) {
    for (const cat of item.categories || []) {
      freq.set(cat, (freq.get(cat) || 0) + 1);
    }
  }

  // 2. Group raw categories by their normalized key
  const groups = new Map(); // key → [rawCategory, ...]
  for (const raw of freq.keys()) {
    const key = categoryKey(raw);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(raw);
  }

  // 3. For each group, pick the best label
  const remap = new Map(); // rawCategory → bestLabel
  for (const [, members] of groups) {
    if (members.length <= 1) continue; // nothing to merge
    // Sort: most frequent first, then shorter, then has uppercase first letter
    members.sort((a, b) => {
      const fa = freq.get(a) || 0;
      const fb = freq.get(b) || 0;
      if (fb !== fa) return fb - fa;
      if (a.length !== b.length) return a.length - b.length;
      const aUp = /^[A-Z]/.test(a) ? 0 : 1;
      const bUp = /^[A-Z]/.test(b) ? 0 : 1;
      return aUp - bUp;
    });
    const best = members[0];
    for (const raw of members) {
      if (raw !== best) remap.set(raw, best);
    }
  }

  // 4. Apply remapping in place, deduplicating per item
  if (remap.size === 0) return;
  for (const item of items) {
    if (!item.categories) continue;
    const seen = new Set();
    const result = [];
    for (const cat of item.categories) {
      const label = remap.get(cat) || cat;
      if (!seen.has(label)) {
        seen.add(label);
        result.push(label);
      }
    }
    item.categories = result;
  }
}

// ===== Advanced Search =====

function getAuthorAliases(author) {
  const normalized = author.trim().toLowerCase();
  for (const aliases of MOD_AUTHOR_ALIASES) {
    if (aliases.some((a) => a.trim().toLowerCase() === normalized)) {
      return aliases.filter((a) => a.trim().toLowerCase() !== normalized);
    }
  }
  return [];
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const _searchTagsCache = new Map();

function buildSearchTags(item) {
  const key = item.name || '';
  if (_searchTagsCache.has(key)) return _searchTagsCache.get(key);

  const tags = [];

  function addTag(term, penalty) {
    if (term && term.length > 0) {
      tags.push({ term: term.toLowerCase(), penalty });
    }
  }

  // Name
  addTag(item.name, 0);

  // Slugified name + parts + acronyms
  if (item.name) {
    const slug = slugify(item.name);
    addTag(slug, 10);
    const parts = slug.split('-').filter((p) => p.length > 0);
    for (const part of parts) {
      addTag(part, 10);
    }
    if (parts.length > 0) {
      const acronym = parts.map((p) => p[0]).join('');
      addTag(acronym, 0);
      // Also generate acronym skipping common stop words
      const STOP_WORDS = new Set(['of', 'the', 'and', 'for', 'a', 'an', 'in', 'on', 'to', 'by', 'or', 'at']);
      const filtered = parts.filter((p) => !STOP_WORDS.has(p));
      if (filtered.length > 0 && filtered.length !== parts.length) {
        const shortAcronym = filtered.map((p) => p[0]).join('');
        addTag(shortAcronym, 0);
      }
    }
  }

  // Authors + aliases
  for (const author of item.authorsList || []) {
    addTag(author, 0);
    for (const alias of getAuthorAliases(author)) {
      addTag(alias, 0);
    }
  }

  // Categories
  for (const cat of item.categories || []) {
    addTag(cat, 20);
  }

  // Versions
  addTag(item.gameVersionReq, 20);
  addTag(item.modVersion, 20);

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const tag of tags) {
    const k = tag.term + ':' + tag.penalty;
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(tag);
    }
  }

  _searchTagsCache.set(key, unique);
  return unique;
}

function scoreTag(tag, query) {
  const t = tag.term;
  if (t === query) return 100 - tag.penalty;           // exact match
  if (t.startsWith(query)) return 75 - tag.penalty;    // starts-with
  if (t.includes(query)) return 50 - tag.penalty;      // contains
  return -1;                                            // no match
}

function searchMods(items, query) {
  if (!query || query.trim().length === 0) return items;

  const queryParts = query
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (queryParts.length === 0) return items;

  const scoreMap = new Map();
  const negativeResults = new Set();
  let hasPositive = false;
  let hasNegative = false;

  for (const qp of queryParts) {
    const isNegative = qp.startsWith('-') && qp.length > 1;
    const actualQuery = isNegative ? qp.substring(1).toLowerCase() : qp.toLowerCase();

    if (isNegative) hasNegative = true;
    else hasPositive = true;

    for (const item of items) {
      const tags = buildSearchTags(item);
      let bestScore = -1;
      for (const tag of tags) {
        const s = scoreTag(tag, actualQuery);
        if (s > bestScore) bestScore = s;
      }
      if (bestScore >= 0) {
        if (isNegative) {
          negativeResults.add(item);
        } else {
          const prev = scoreMap.get(item) || 0;
          scoreMap.set(item, Math.max(prev, bestScore));
        }
      }
    }
  }

  let result;
  if (hasPositive && scoreMap.size > 0) {
    result = items.filter((item) => scoreMap.has(item) && !negativeResults.has(item));
  } else if (!hasPositive && hasNegative) {
    result = items.filter((item) => !negativeResults.has(item));
  } else if (hasPositive && scoreMap.size === 0) {
    result = [];
  } else {
    result = items;
  }

  // Attach scores for relevance sorting
  for (const item of result) {
    item._searchScore = scoreMap.get(item) || 0;
  }

  return result;
}

// ===== Highest Game Version =====
let highestGameVersion = '';

function isOutdatedVersion(rawVersion) {
  if (!rawVersion || !highestGameVersion) return false;
  const base = normalizeBaseVersion(rawVersion);
  if (!base) return false;
  return compareVersions(base, highestGameVersion) < 0;
}

// ===== State =====
let state = {
  allItems: [],
  filteredItems: [],
  lastUpdated: null,
  view: localStorage.getItem(LS_VIEW) || DEFAULT_VIEW,
  cardSize: parseInt(localStorage.getItem(LS_CARD_SIZE) || DEFAULT_CARD_SIZE, 10),
  search: '',
  category: '',
  version: '',
  sort: localStorage.getItem(LS_SORT) || DEFAULT_SORT,
};

// ===== DOM References =====
const $ = (id) => document.getElementById(id);
const loadingState = $('loadingState');
const errorState = $('errorState');
const errorMessage = $('errorMessage');
const modContainer = $('modContainer');
const searchInput = $('searchInput');
const searchClear = $('searchClear');
const categoryFilter = $('categoryFilter');
const versionFilter = $('versionFilter');
const sortSelect = $('sortSelect');
const sizeSlider = $('sizeSlider');
const gridViewBtn = $('gridViewBtn');
const listViewBtn = $('listViewBtn');
const resultCount = $('resultCount');
const lastUpdatedEl = $('lastUpdated');
const detailModal = $('detailModal');
const modalBody = $('modalBody');
const modalClose = $('modalClose');
const aboutModal = $('aboutModal');
const aboutBtn = $('aboutBtn');
const aboutClose = $('aboutClose');
const retryBtn = $('retryBtn');

// ===== Init =====
async function init() {
  // Set version in UI
  $('appVersionHeader').textContent = APP_VERSION;
  $('appVersionAbout').textContent = APP_VERSION;

  // Restore persisted state
  sortSelect.value = state.sort;
  sizeSlider.value = state.cardSize;
  document.documentElement.style.setProperty('--card-size', state.cardSize + 'px');
  updateViewToggle();

  // Bind events
  bindEvents();

  // Fetch data
  await fetchMods();
}

// ===== Data Fetching =====
async function fetchMods() {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  modContainer.classList.add('hidden');

  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.allItems = data.items || [];
    state.lastUpdated = data.lastUpdated || null;

    if (state.lastUpdated) {
      const d = new Date(state.lastUpdated);
      lastUpdatedEl.textContent = 'Data updated ' + d.toLocaleString();
    }

    // Normalize categories to merge duplicates (e.g. Library/Libraries)
    normalizeCategories(state.allItems);

    // Pre-build search tags cache
    for (const item of state.allItems) {
      buildSearchTags(item);
    }

    populateFilters();
    applyFilters();

    loadingState.classList.add('hidden');
    modContainer.classList.remove('hidden');
  } catch (err) {
    loadingState.classList.add('hidden');
    errorMessage.textContent = 'Failed to load mod data: ' + err.message;
    errorState.classList.remove('hidden');
  }
}

// ===== Populate Filters =====
function populateFilters() {
  const categoryModCount = new Map();

  // Build normalized version map and count mods per base version
  normalizedVersionMap = new Map();
  const versionModCount = new Map();

  for (const item of state.allItems) {
    if (item.categories) item.categories.forEach((c) => {
      categoryModCount.set(c, (categoryModCount.get(c) || 0) + 1);
    });
    if (item.gameVersionReq) {
      const base = normalizeBaseVersion(item.gameVersionReq);
      if (base) {
        if (!normalizedVersionMap.has(base)) {
          normalizedVersionMap.set(base, new Set());
        }
        normalizedVersionMap.get(base).add(item.gameVersionReq);
        versionModCount.set(base, (versionModCount.get(base) || 0) + 1);
      }
    }
  }

  // Categories — exclude empty ones
  const sortedCats = [...categoryModCount.keys()]
    .filter((c) => c && c.trim().length > 0 && (categoryModCount.get(c) || 0) > 0)
    .sort((a, b) => a.localeCompare(b));
  for (const cat of sortedCats) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  }

  // Versions — sorted newest first, exclude versions with fewer than 3 mods
  const sortedVers = [...normalizedVersionMap.keys()]
    .filter((v) => (versionModCount.get(v) || 0) >= MIN_VERSION_MOD_COUNT)
    .sort((a, b) => compareVersions(b, a));

  // Highest game version is the first in the sorted (dropdown-eligible) list
  highestGameVersion = sortedVers.length > 0 ? sortedVers[0] : '';

  for (const ver of sortedVers) {
    const opt = document.createElement('option');
    opt.value = ver;
    opt.textContent = ver;
    versionFilter.appendChild(opt);
  }
}

// ===== Name Comparison (brackets sort last) =====
function nameCompare(a, b) {
  const aName = a.name || '';
  const bName = b.name || '';
  const aIsBracket = /^[^a-zA-Z0-9]/.test(aName);
  const bIsBracket = /^[^a-zA-Z0-9]/.test(bName);
  if (aIsBracket !== bIsBracket) return aIsBracket ? 1 : -1;
  return aName.localeCompare(bName);
}

// ===== Filtering & Sorting =====
function applyFilters() {
  const cat = state.category;
  const ver = state.version;

  // Start with search
  let items = searchMods(state.allItems, state.search);

  // Category filter
  if (cat) {
    items = items.filter((item) => (item.categories || []).includes(cat));
  }

  // Version filter (using normalized version map)
  if (ver) {
    const rawVersions = normalizedVersionMap.get(ver);
    if (rawVersions) {
      items = items.filter((item) => item.gameVersionReq && rawVersions.has(item.gameVersionReq));
    } else {
      items = [];
    }
  }

  // Sort
  const activeSort = state.sort;
  const [sortKey, sortDir] = activeSort.split('-');
  items.sort((a, b) => {
    if (sortKey === 'relevance') {
      const cmp = (b._searchScore || 0) - (a._searchScore || 0);
      return cmp !== 0 ? cmp : nameCompare(a, b);
    } else if (sortKey === 'name') {
      const cmp = nameCompare(a, b);
      return sortDir === 'asc' ? cmp : -cmp;
    } else if (sortKey === 'date') {
      const da = new Date(a.dateTimeCreated || 0).getTime();
      const db = new Date(b.dateTimeCreated || 0).getTime();
      return sortDir === 'asc' ? da - db : db - da;
    } else if (sortKey === 'version') {
      // Sort by game version, descending. No version → last.
      const aVer = a.gameVersionReq || '';
      const bVer = b.gameVersionReq || '';
      if (!aVer && !bVer) return nameCompare(a, b);
      if (!aVer) return 1;
      if (!bVer) return -1;
      const cmp = compareVersions(aVer, bVer);
      if (cmp !== 0) return -cmp; // descending: newest first
      return nameCompare(a, b); // secondary sort by name
    }
    return 0;
  });

  state.filteredItems = items;

  resultCount.textContent = `${items.length} of ${state.allItems.length} mods`;

  render();
}

// ===== Rendering =====
function render() {
  if (state.view === 'grid') {
    renderGrid();
  } else {
    renderList();
  }
}

function renderGrid() {
  modContainer.className = 'mod-grid';
  modContainer.innerHTML = '';

  for (const item of state.filteredItems) {
    const card = document.createElement('div');
    card.className = 'mod-card';
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking a link button or FAB
      if (e.target.closest('.link-btn') || e.target.closest('.card-fab')) return;
      openDetail(item);
    });

    const imgUrl = getFirstImage(item);
    const imgHtml = imgUrl
      ? `<img class="card-image" src="${escAttr(imgUrl)}" alt="" loading="lazy" onerror="this.replaceWith(makePlaceholder('card'))">`
      : `<div class="card-image-placeholder"><span class="material-icons">image</span></div>`;

    const authors = (item.authorsList || []).join(', ') || 'Unknown';
    const date = formatDate(item.dateTimeCreated);
    const version = item.gameVersionReq || '';

    const catsHtml = (item.categories || [])
      .map((c) => `<span class="chip">${esc(c)}</span>`)
      .join('');

    const linksHtml = buildLinkButtons(item.urls);
    const fabHtml = buildDownloadFab(item.urls);

    // Strip HTML tags from summary for display
    const summary = stripHtml(item.summary || '');

    const outdated = isOutdatedVersion(item.gameVersionReq);

    card.innerHTML = `
      ${imgHtml}
      <div class="card-body">
        <div class="card-name">${esc(item.name || 'Untitled')}</div>
        <div class="card-author">${esc(authors)}</div>
        <div class="card-meta">
          ${version ? `<span class="card-meta-item${outdated ? ' outdated-version' : ''}"${outdated ? ` title="Latest game version is ${highestGameVersion}"` : ''}><span class="material-icons">sports_esports</span>${esc(version)}</span>` : ''}
          ${date ? `<span class="card-meta-item"><span class="material-icons">calendar_today</span>${esc(date)}</span>` : ''}
        </div>
        ${catsHtml ? `<div class="card-categories">${catsHtml}</div>` : ''}
        <div class="card-summary">${esc(summary)}</div>
        ${linksHtml ? `<div class="card-links">${linksHtml}</div>` : ''}
      </div>
      ${fabHtml}
    `;

    modContainer.appendChild(card);
  }
}

function renderList() {
  modContainer.className = 'mod-list';
  modContainer.innerHTML = '';

  for (const item of state.filteredItems) {
    const row = document.createElement('div');
    row.className = 'mod-row';
    row.addEventListener('click', (e) => {
      if (e.target.closest('.link-btn') || e.target.closest('.row-download-btn')) return;
      openDetail(item);
    });

    const imgUrl = getFirstImage(item);
    const imgHtml = imgUrl
      ? `<img class="row-thumb" src="${escAttr(imgUrl)}" alt="" loading="lazy" onerror="this.replaceWith(makePlaceholder('row'))">`
      : `<div class="row-thumb-placeholder"><span class="material-icons">image</span></div>`;

    const authors = (item.authorsList || []).join(', ') || 'Unknown';
    const date = formatDate(item.dateTimeCreated);
    const version = item.gameVersionReq || '\u2014';

    const catsHtml = (item.categories || [])
      .map((c) => `<span class="chip">${esc(c)}</span>`)
      .join('');

    const linksHtml = buildLinkButtons(item.urls);
    const dlBtnHtml = buildRowDownloadBtn(item.urls);
    const rowOutdated = isOutdatedVersion(item.gameVersionReq);

    row.innerHTML = `
      ${imgHtml}
      <div class="row-info">
        <div class="row-name">${esc(item.name || 'Untitled')}</div>
        <div class="row-author">${esc(authors)}</div>
      </div>
      <div class="row-version${rowOutdated ? ' outdated-version' : ''}"${rowOutdated ? ` title="Latest game version is ${highestGameVersion}"` : ''}>${esc(version)}</div>
      <div class="row-date">${esc(date)}</div>
      <div class="row-categories">${catsHtml}</div>
      <div class="row-links">${dlBtnHtml}${linksHtml}</div>
    `;

    modContainer.appendChild(row);
  }
}

// ===== Detail Modal =====
function openDetail(item) {
  const images = getImages(item);
  const authors = (item.authorsList || []).join(', ') || 'Unknown';
  const dateCreated = formatDate(item.dateTimeCreated);
  const dateEdited = item.dateTimeEdited ? formatDate(item.dateTimeEdited) : null;
  const version = item.gameVersionReq || '';
  const modVer = item.modVersion || '';

  const galleryHtml =
    images.length > 0
      ? `<div class="detail-images-section"><div class="detail-gallery">${images
          .map(
            (url) =>
              `<img src="${escAttr(url)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          )
          .join('')}</div></div>`
      : '';

  const catsHtml = (item.categories || [])
    .map((c) => `<span class="chip">${esc(c)}</span>`)
    .join('');

  const linksHtml = buildDetailLinkButtons(item.urls);

  // Process description: handle <br />, basic markdown links, and Discord formatting
  const description = processDescription(item.description || item.summary || '');

  const detailOutdated = isOutdatedVersion(item.gameVersionReq);
  const metaParts = [];
  if (version)
    metaParts.push(
      `<span class="detail-meta-item${detailOutdated ? ' outdated-version' : ''}"${detailOutdated ? ` title="Latest game version is ${highestGameVersion}"` : ''}><span class="material-icons">sports_esports</span>Game: ${esc(version)}</span>`
    );
  if (modVer)
    metaParts.push(
      `<span class="detail-meta-item"><span class="material-icons">tag</span>Mod: ${esc(modVer)}</span>`
    );
  if (dateCreated)
    metaParts.push(
      `<span class="detail-meta-item"><span class="material-icons">calendar_today</span>Created: ${esc(dateCreated)}</span>`
    );
  if (dateEdited)
    metaParts.push(
      `<span class="detail-meta-item"><span class="material-icons">edit_calendar</span>Updated: ${esc(dateEdited)}</span>`
    );

  modalBody.innerHTML = `
    ${galleryHtml}
    <div class="detail-header">
      <div class="detail-name">${esc(item.name || 'Untitled')}</div>
      <div class="detail-author">${esc(authors)}</div>
      <div class="detail-meta">${metaParts.join('')}</div>
      ${catsHtml ? `<div class="detail-categories">${catsHtml}</div>` : ''}
    </div>
    <div class="detail-section">
      <div class="detail-description">${description}</div>
    </div>
    ${linksHtml ? `<div class="detail-links">${linksHtml}</div>` : ''}
  `;

  detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Set up drag-to-scroll and click-to-lightbox on gallery
  const gallery = modalBody.querySelector('.detail-gallery');
  if (gallery) {
    initDragScroll(gallery);
  }
}

function closeDetail() {
  detailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== Drag-to-scroll for gallery =====
function initDragScroll(el) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;

  el.addEventListener('mousedown', (e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    el.classList.add('dragging');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    e.preventDefault();
  });

  el.addEventListener('mouseleave', () => {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
  });

  el.addEventListener('mouseup', (e) => {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
    // If the user didn't drag, treat it as a click on the image
    if (!hasDragged && e.target.tagName === 'IMG') {
      openLightbox(e.target.src);
    }
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 5) hasDragged = true;
    el.scrollLeft = scrollLeft - walk;
  });

  // Also support click on images for touch/non-drag users
  el.addEventListener('click', (e) => {
    // Only fire if not coming from a drag (mouseup already handles drag case)
    if (e.target.tagName === 'IMG' && !hasDragged) {
      openLightbox(e.target.src);
    }
  });
}

// ===== Image Lightbox =====
function openLightbox(src) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('hidden');
  document.getElementById('lightboxImg').src = '';
}

// ===== Helpers =====
function getFirstImage(item) {
  if (!item.images) return null;
  const keys = Object.keys(item.images);
  if (keys.length === 0) return null;
  const img = item.images[keys[0]];
  return img.url || img.proxyUrl || null;
}

function getImages(item) {
  if (!item.images) return [];
  return Object.values(item.images)
    .map((img) => img.url || img.proxyUrl)
    .filter(Boolean);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function buildLinkButtons(urls) {
  if (!urls) return '';

  let html = '';

  // Render all links as normal buttons (DirectDownload is handled as a FAB separately)
  for (const [key, url] of Object.entries(urls)) {
    // Skip DirectDownload — it's rendered as a FAB on the card
    if (key === 'DirectDownload') continue;
    const icon = LINK_ICONS[key] || 'link';
    const label = LINK_LABELS[key] || key;
    html += `<a class="link-btn" href="${escAttr(url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><span class="material-icons">${icon}</span>${esc(label)}</a>`;
  }

  return html;
}

function buildDownloadFab(urls) {
  if (!urls || !urls.DirectDownload) return '';
  return `<a class="card-fab" href="${escAttr(urls.DirectDownload)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Download"><span class="material-icons">download</span></a>`;
}

function buildRowDownloadBtn(urls) {
  if (!urls || !urls.DirectDownload) return '';
  return `<a class="row-download-btn" href="${escAttr(urls.DirectDownload)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Download"><span class="material-icons">download</span></a>`;
}

function buildDetailLinkButtons(urls) {
  if (!urls) return '';

  let html = '';

  // DirectDownload gets prominent style, rendered first
  if (urls.DirectDownload) {
    html += `<a class="detail-link-btn detail-link-btn--primary" href="${escAttr(urls.DirectDownload)}" target="_blank" rel="noopener"><span class="material-icons">download</span>${esc('Download')}</a>`;
  }

  // Render remaining links as normal buttons
  for (const [key, url] of Object.entries(urls)) {
    if (key === 'DirectDownload') continue;
    const icon = LINK_ICONS[key] || 'link';
    const label = LINK_LABELS[key] || key;
    html += `<a class="detail-link-btn" href="${escAttr(url)}" target="_blank" rel="noopener"><span class="material-icons">${icon}</span>${esc(label)}</a>`;
  }

  return html;
}

function processDescription(desc) {
  // Escape HTML first, then selectively re-enable safe formatting
  let text = esc(desc);

  // Convert <br /> and <br> (escaped) back to actual line breaks
  text = text.replace(/&lt;br\s*\/?&gt;/gi, '\n');

  // Convert markdown-style links: [text](url) and <url>
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  text = text.replace(
    /&lt;(https?:\/\/[^&]+)&gt;/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );

  // Convert BBCode-style links: [url=...]...[/url]
  text = text.replace(
    /\[url=(https?:\/\/[^\]]+)\]([^[]*)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener">$2</a>'
  );

  // Bold: **text** or [b]text[/b]
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\[b\]([^[]*)\[\/b\]/gi, '<strong>$1</strong>');

  // Italic: [i]text[/i]
  text = text.replace(/\[i\]([^[]*)\[\/i\]/gi, '<em>$1</em>');

  // Strip remaining BBCode tags like [size=...], [quote], etc.
  text = text.replace(/\[\/?(?:size|quote|img|color|list|code)(?:=[^\]]*)?\]/gi, '');

  // Convert Discord user mentions to just the ID indicator
  text = text.replace(/&lt;@\d+&gt;/g, '');

  return text;
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function esc(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function escAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Global helper for onerror image fallback
function makePlaceholder(type) {
  const el = document.createElement('div');
  el.className = type === 'card' ? 'card-image-placeholder' : 'row-thumb-placeholder';
  const icon = document.createElement('span');
  icon.className = 'material-icons';
  icon.textContent = 'image';
  el.appendChild(icon);
  return el;
}

// ===== View Toggle =====
function updateViewToggle() {
  if (state.view === 'grid') {
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
  } else {
    gridViewBtn.classList.remove('active');
    listViewBtn.classList.add('active');
  }
}

// ===== Event Binding =====
function bindEvents() {
  // Search (debounced)
  let searchTimeout;
  let _sortBeforeSearch = null;
  let _userOverrodeRelevance = false;

  function showRelevanceSort() {
    let opt = sortSelect.querySelector('option[value="relevance-desc"]');
    if (!opt) {
      opt = document.createElement('option');
      opt.value = 'relevance-desc';
      opt.textContent = 'Relevance';
      sortSelect.prepend(opt);
    }
    if (!_userOverrodeRelevance) {
      if (_sortBeforeSearch === null) {
        _sortBeforeSearch = state.sort;
      }
      sortSelect.value = 'relevance-desc';
      state.sort = 'relevance-desc';
    }
  }

  function hideRelevanceSort() {
    const opt = sortSelect.querySelector('option[value="relevance-desc"]');
    if (opt) opt.remove();
    if (_sortBeforeSearch !== null) {
      state.sort = _sortBeforeSearch;
      sortSelect.value = _sortBeforeSearch;
      _sortBeforeSearch = null;
    }
    _userOverrodeRelevance = false;
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = searchInput.value;
      searchClear.classList.toggle('hidden', !state.search);
      if (state.search) {
        showRelevanceSort();
      } else {
        hideRelevanceSort();
      }
      applyFilters();
    }, SEARCH_DEBOUNCE_MS);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    searchClear.classList.add('hidden');
    hideRelevanceSort();
    applyFilters();
  });

  // Filters
  categoryFilter.addEventListener('change', () => {
    state.category = categoryFilter.value;
    applyFilters();
  });

  versionFilter.addEventListener('change', () => {
    state.version = versionFilter.value;
    applyFilters();
  });

  // Sort
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    if (state.search && state.sort !== 'relevance-desc') {
      // User manually chose a sort during search — respect it
      _userOverrodeRelevance = true;
      _sortBeforeSearch = state.sort;
    }
    if (state.sort !== 'relevance-desc') {
      localStorage.setItem(LS_SORT, state.sort);
    }
    applyFilters();
  });

  // Size slider
  sizeSlider.addEventListener('input', () => {
    state.cardSize = parseInt(sizeSlider.value, 10);
    document.documentElement.style.setProperty('--card-size', state.cardSize + 'px');
    localStorage.setItem(LS_CARD_SIZE, state.cardSize);
  });

  // View toggle
  gridViewBtn.addEventListener('click', () => {
    state.view = 'grid';
    localStorage.setItem(LS_VIEW, 'grid');
    updateViewToggle();
    render();
  });

  listViewBtn.addEventListener('click', () => {
    state.view = 'list';
    localStorage.setItem(LS_VIEW, 'list');
    updateViewToggle();
    render();
  });

  // Modal close
  modalClose.addEventListener('click', closeDetail);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetail();
  });

  // About
  aboutBtn.addEventListener('click', () => {
    const count = state.allItems.length;
    $('aboutModCount').textContent = count ? count.toLocaleString() : '—';
    if (state.lastUpdated) {
      const d = new Date(state.lastUpdated);
      $('aboutLastUpdated').textContent = d.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } else {
      $('aboutLastUpdated').textContent = '—';
    }
    aboutModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });
  aboutClose.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
    document.body.style.overflow = '';
  });
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // Lightbox close
  const lightbox = document.getElementById('lightbox');
  lightbox.addEventListener('click', closeLightbox);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!lightbox.classList.contains('hidden')) closeLightbox();
      else if (!detailModal.classList.contains('hidden')) closeDetail();
      else if (!aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }
  });

  // Retry
  retryBtn.addEventListener('click', fetchMods);
}

// ===== Start =====
init();

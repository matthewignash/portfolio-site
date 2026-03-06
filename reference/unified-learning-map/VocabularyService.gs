// ============================================================================
// VOCABULARY SERVICE
// Academic vocabulary CRUD with auto-translation via LanguageApp.
// Vocabulary can be defined at unit level and hex level.
// Translations are generated on save and cached in the vocabulary JSON.
// Teachers can override any translation.
// ============================================================================

const VOCAB_TARGET_LANGUAGES = ['ja', 'ko', 'fr', 'ta', 'zh', 'es', 'ar', 'hi', 'vi', 'tl', 'pt', 'ru', 'de', 'it'];
const VOCAB_LANG_LABELS = {
  ja: 'Japanese', ko: 'Korean', fr: 'French', ta: 'Tamil',
  zh: 'Chinese', es: 'Spanish', ar: 'Arabic', hi: 'Hindi',
  vi: 'Vietnamese', tl: 'Filipino', pt: 'Portuguese', ru: 'Russian',
  de: 'German', it: 'Italian'
};

// ================================================
// UNIT-LEVEL VOCABULARY
// ================================================

/**
 * Save vocabulary for a unit. Translates new/changed terms automatically.
 * Preserves teacher translation overrides.
 *
 * @param {string} unitId - Unit ID
 * @param {Array<Object>} vocabulary - Array of vocab entries
 * @returns {Object} { success, vocabulary, translationErrors }
 */
function saveUnitVocabulary(unitId, vocabulary) {
  requireRole(['administrator', 'teacher']);
  if (!unitId) throw new Error('Unit ID is required');

  const unit = getUnitById(unitId);
  if (!unit) throw new Error('Unit not found');
  if (!canEditCourse(unit.courseId)) throw new Error('Permission denied');

  // Validate and normalize entries
  const validated = [];
  const errors = [];
  const entries = vocabulary || [];
  for (let i = 0; i < entries.length; i++) {
    const v = validateVocabEntry_(entries[i]);
    if (v.error) {
      errors.push('Entry ' + (i + 1) + ': ' + v.error);
    } else {
      validated.push(v.entry);
    }
  }

  if (errors.length > 0) {
    throw new Error('Vocabulary validation errors: ' + errors.join('; '));
  }

  // Get existing vocabulary to preserve overrides
  const existingVocab = safeJsonParse_(unit.vocabularyJson, []);
  const existingMap = {};
  for (let i = 0; i < existingVocab.length; i++) {
    if (existingVocab[i].vocabId) {
      existingMap[existingVocab[i].vocabId] = existingVocab[i];
    }
  }

  // Translate new/changed terms
  const translationErrors = [];
  for (let i = 0; i < validated.length; i++) {
    const entry = validated[i];
    const existing = existingMap[entry.vocabId];

    // Determine if translation is needed
    const needsTranslation = !existing ||
      existing.term !== entry.term ||
      existing.definition !== entry.definition;

    if (needsTranslation) {
      const result = translateVocabulary_(entry);
      if (result.errors && result.errors.length > 0) {
        for (let e = 0; e < result.errors.length; e++) {
          translationErrors.push(entry.term + ': ' + result.errors[e]);
        }
      }
      entry.translations = result.translations;
    } else {
      // Preserve existing translations
      entry.translations = existing.translations || {};
    }

    // Preserve teacher overrides
    if (existing && existing.translationOverrides) {
      entry.translationOverrides = existing.translationOverrides;
    }
    if (!entry.translationOverrides) {
      entry.translationOverrides = {};
    }
  }

  // Save to unit
  unit.vocabularyJson = safeJsonStringify_(validated, '[]');
  upsertRow_(SHEETS_.UNITS, 'unitId', unit);

  return {
    success: true,
    vocabulary: validated,
    translationErrors: translationErrors
  };
}

/**
 * Get vocabulary for a unit.
 *
 * @param {string} unitId - Unit ID
 * @returns {Array<Object>} Vocabulary entries with translations
 */
function getUnitVocabulary(unitId) {
  if (!unitId) return [];
  const unit = getUnitById(unitId);
  if (!unit) return [];
  return safeJsonParse_(unit.vocabularyJson, []);
}

// ================================================
// HEX-LEVEL VOCABULARY
// ================================================

/**
 * Save vocabulary for a specific hex. Translates new/changed terms.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {Array<Object>} vocabulary - Array of vocab entries
 * @returns {Object} { success, vocabulary, translationErrors }
 */
function saveHexVocabulary(mapId, hexId, vocabulary) {
  requireRole(['administrator', 'teacher']);
  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required');

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found');

  const hexes = safeJsonParse_(map.hexesJson, []);
  let hexIndex = -1;
  for (let i = 0; i < hexes.length; i++) {
    if (String(hexes[i].id) === String(hexId)) {
      hexIndex = i;
      break;
    }
  }
  if (hexIndex < 0) throw new Error('Hex not found');

  // Validate entries
  const validated = [];
  const errors = [];
  const entries = vocabulary || [];
  for (let i = 0; i < entries.length; i++) {
    const v = validateVocabEntry_(entries[i]);
    if (v.error) {
      errors.push('Entry ' + (i + 1) + ': ' + v.error);
    } else {
      validated.push(v.entry);
    }
  }

  if (errors.length > 0) {
    throw new Error('Vocabulary validation errors: ' + errors.join('; '));
  }

  // Get existing hex vocabulary to preserve overrides
  const existingVocab = hexes[hexIndex].vocabulary || [];
  const existingMap = {};
  for (let i = 0; i < existingVocab.length; i++) {
    if (existingVocab[i].vocabId) {
      existingMap[existingVocab[i].vocabId] = existingVocab[i];
    }
  }

  // Translate new/changed terms
  const translationErrors = [];
  for (let i = 0; i < validated.length; i++) {
    const entry = validated[i];
    const existing = existingMap[entry.vocabId];

    const needsTranslation = !existing ||
      existing.term !== entry.term ||
      existing.definition !== entry.definition;

    if (needsTranslation) {
      const result = translateVocabulary_(entry);
      if (result.errors && result.errors.length > 0) {
        for (let e = 0; e < result.errors.length; e++) {
          translationErrors.push(entry.term + ': ' + result.errors[e]);
        }
      }
      entry.translations = result.translations;
    } else {
      entry.translations = existing.translations || {};
    }

    if (existing && existing.translationOverrides) {
      entry.translationOverrides = existing.translationOverrides;
    }
    if (!entry.translationOverrides) {
      entry.translationOverrides = {};
    }
  }

  // Save to hex
  hexes[hexIndex].vocabulary = validated;
  map.hexesJson = safeJsonStringify_(hexes, '[]');
  saveMap(map);

  return {
    success: true,
    vocabulary: validated,
    translationErrors: translationErrors
  };
}

/**
 * Get vocabulary for a specific hex.
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @returns {Array<Object>} Vocabulary entries
 */
function getHexVocabulary(mapId, hexId) {
  if (!mapId || !hexId) return [];
  const map = getMapById(mapId);
  if (!map) return [];

  const hexes = safeJsonParse_(map.hexesJson, []);
  for (let i = 0; i < hexes.length; i++) {
    if (String(hexes[i].id) === String(hexId)) {
      return hexes[i].vocabulary || [];
    }
  }
  return [];
}

// ================================================
// MAP-LEVEL VOCABULARY (combines unit + hex)
// ================================================

/**
 * Get all vocabulary for a map: unit-level + all hex-level, combined.
 * Used by the student dictionary panel.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { unitVocabulary, hexVocabulary: {hexId: [...]}, allTerms }
 */
function getMapVocabulary(mapId) {
  if (!mapId) return { unitVocabulary: [], hexVocabulary: {}, allTerms: [] };

  const map = getMapById(mapId);
  if (!map) return { unitVocabulary: [], hexVocabulary: {}, allTerms: [] };

  // Get unit vocabulary
  let unitVocabulary = [];
  if (map.unitId) {
    const unit = getUnitById(map.unitId);
    if (unit) {
      unitVocabulary = safeJsonParse_(unit.vocabularyJson, []);
    }
  }

  // Get hex vocabulary
  const hexVocabulary = {};
  const hexes = safeJsonParse_(map.hexesJson, []);
  for (let i = 0; i < hexes.length; i++) {
    const hex = hexes[i];
    if (hex.vocabulary && hex.vocabulary.length > 0) {
      hexVocabulary[hex.id] = hex.vocabulary;
    }
  }

  // Combine all terms (dedup by vocabId)
  const allTerms = [];
  const seen = {};

  for (let i = 0; i < unitVocabulary.length; i++) {
    const v = unitVocabulary[i];
    if (!seen[v.vocabId]) {
      seen[v.vocabId] = true;
      allTerms.push(v);
    }
  }

  const hexIds = Object.keys(hexVocabulary);
  for (let h = 0; h < hexIds.length; h++) {
    const hvArr = hexVocabulary[hexIds[h]];
    for (let i = 0; i < hvArr.length; i++) {
      const v = hvArr[i];
      if (!seen[v.vocabId]) {
        seen[v.vocabId] = true;
        allTerms.push(v);
      }
    }
  }

  // Sort alphabetically by term
  allTerms.sort(function(a, b) {
    return (a.term || '').toLowerCase() < (b.term || '').toLowerCase() ? -1 : 1;
  });

  return {
    unitVocabulary: unitVocabulary,
    hexVocabulary: hexVocabulary,
    allTerms: allTerms
  };
}

// ================================================
// VOCABULARY COVERAGE ANALYTICS
// ================================================

/**
 * Get vocabulary coverage analytics for a map.
 * Returns tier distribution, unassigned terms, and teaching vs assessment hex counts.
 *
 * @param {string} mapId - Map ID
 * @returns {Object} { totalTerms, tierCounts, unassigned, teachingHexCount, assessmentHexCount }
 */
function getVocabularyCoverage(mapId) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) throw new Error('Map ID is required');

  const map = getMapById(mapId);
  if (!map) throw new Error('Map not found');

  const hexes = safeJsonParse_(map.hexesJson, []);

  // Collect unit vocab
  let unitVocabulary = [];
  if (map.unitId) {
    const unit = getUnitById(map.unitId);
    if (unit) unitVocabulary = safeJsonParse_(unit.vocabularyJson, []);
  }

  // Collect hex vocab with hex metadata
  const hexVocabMap = {};   // vocabId -> hexId[]
  const hexTypeMap = {};    // hexId -> hex.type
  const allHexVocab = [];

  for (let i = 0; i < hexes.length; i++) {
    const hex = hexes[i];
    hexTypeMap[hex.id] = hex.type || 'core';
    if (hex.vocabulary) {
      for (let v = 0; v < hex.vocabulary.length; v++) {
        const entry = hex.vocabulary[v];
        if (!hexVocabMap[entry.vocabId]) hexVocabMap[entry.vocabId] = [];
        hexVocabMap[entry.vocabId].push(hex.id);
        allHexVocab.push(entry);
      }
    }
  }

  // Dedup all terms
  const seen = {};
  const allTerms = [];
  const combined = unitVocabulary.concat(allHexVocab);
  for (let i = 0; i < combined.length; i++) {
    if (combined[i].vocabId && !seen[combined[i].vocabId]) {
      seen[combined[i].vocabId] = true;
      allTerms.push(combined[i]);
    }
  }

  // Compute tier counts + assignment analytics
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  const unassigned = [];
  const teachingVocabIds = {};
  const assessmentVocabIds = {};

  for (let i = 0; i < allTerms.length; i++) {
    const t = allTerms[i];
    const tier = t.tier || 3;
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;

    const assignedHexes = hexVocabMap[t.vocabId] || [];
    if (assignedHexes.length === 0) {
      unassigned.push({ vocabId: t.vocabId, term: t.term, tier: tier });
    }
    for (let h = 0; h < assignedHexes.length; h++) {
      const hType = hexTypeMap[assignedHexes[h]] || 'core';
      if (hType === 'assessment') {
        assessmentVocabIds[t.vocabId] = true;
      } else {
        teachingVocabIds[t.vocabId] = true;
      }
    }
  }

  return {
    totalTerms: allTerms.length,
    tierCounts: tierCounts,
    unassigned: unassigned,
    teachingHexCount: Object.keys(teachingVocabIds).length,
    assessmentHexCount: Object.keys(assessmentVocabIds).length
  };
}

// ================================================
// TRANSLATION ENGINE
// ================================================

/**
 * Translate a single vocabulary entry into all target languages.
 * Uses LanguageApp.translate() — Google's built-in translation in GAS.
 *
 * @param {Object} entry - Vocab entry with term and definition
 * @returns {Object} { translations: {lang: {term, definition}}, errors: [] }
 * @private
 */
function translateVocabulary_(entry) {
  const translations = {};
  const errors = [];

  for (let i = 0; i < VOCAB_TARGET_LANGUAGES.length; i++) {
    const lang = VOCAB_TARGET_LANGUAGES[i];
    try {
      const translatedTerm = translateText_(entry.term, lang);
      const translatedDef = translateText_(entry.definition, lang);
      const translatedSimplified = entry.simplifiedDefinition
        ? translateText_(entry.simplifiedDefinition, lang)
        : '';
      translations[lang] = {
        term: translatedTerm,
        definition: translatedDef,
        simplifiedDefinition: translatedSimplified
      };
    } catch (err) {
      errors.push(VOCAB_LANG_LABELS[lang] + ' translation failed: ' + err.message);
      translations[lang] = {
        term: '',
        definition: '',
        simplifiedDefinition: '',
        error: true
      };
    }
  }

  return { translations: translations, errors: errors };
}

/**
 * Translate a single text string using LanguageApp.
 *
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (one of VOCAB_TARGET_LANGUAGES, e.g. ja, ko, zh, es)
 * @returns {string} Translated text
 * @private
 */
function translateText_(text, targetLang) {
  if (!text || text.trim() === '') return '';
  try {
    return LanguageApp.translate(text, 'en', targetLang);
  } catch (err) {
    Logger.log('Translation error (' + targetLang + '): ' + err.message);
    throw err;
  }
}

// ================================================
// TRANSLATION OVERRIDE
// ================================================

/**
 * Save a teacher's translation override for a specific vocab entry.
 *
 * @param {string} unitId - Unit ID (null for hex-level)
 * @param {string} mapId - Map ID (null for unit-level)
 * @param {string} hexId - Hex ID (null for unit-level)
 * @param {string} vocabId - Vocabulary entry ID
 * @param {string} lang - Language code (one of VOCAB_TARGET_LANGUAGES, e.g. ja, ko, zh, es)
 * @param {string} field - Field to override: 'term' or 'definition'
 * @param {string} overrideValue - The corrected translation
 * @returns {Object} { success: true }
 */
function saveTranslationOverride(unitId, mapId, hexId, vocabId, lang, field, overrideValue) {
  requireRole(['administrator', 'teacher']);

  if (!vocabId || !lang || !field) {
    throw new Error('vocabId, lang, and field are required');
  }
  if (VOCAB_TARGET_LANGUAGES.indexOf(lang) === -1) {
    throw new Error('Invalid language: ' + lang);
  }
  if (field !== 'term' && field !== 'definition') {
    throw new Error('Field must be "term" or "definition"');
  }

  const override = String(overrideValue || '').substring(0, 500);

  if (unitId) {
    // Unit-level vocabulary
    const unit = getUnitById(unitId);
    if (!unit) throw new Error('Unit not found');
    if (!canEditCourse(unit.courseId)) throw new Error('Permission denied');

    const vocab = safeJsonParse_(unit.vocabularyJson, []);
    let found = false;
    for (let i = 0; i < vocab.length; i++) {
      if (vocab[i].vocabId === vocabId) {
        if (!vocab[i].translationOverrides) vocab[i].translationOverrides = {};
        if (!vocab[i].translationOverrides[lang]) vocab[i].translationOverrides[lang] = {};
        vocab[i].translationOverrides[lang][field] = override;
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Vocabulary entry not found');

    unit.vocabularyJson = safeJsonStringify_(vocab, '[]');
    upsertRow_(SHEETS_.UNITS, 'unitId', unit);

  } else if (mapId && hexId) {
    // Hex-level vocabulary
    const map = getMapById(mapId);
    if (!map) throw new Error('Map not found');

    const hexes = safeJsonParse_(map.hexesJson, []);
    let found = false;
    for (let h = 0; h < hexes.length; h++) {
      if (String(hexes[h].id) === String(hexId)) {
        const vocab = hexes[h].vocabulary || [];
        for (let i = 0; i < vocab.length; i++) {
          if (vocab[i].vocabId === vocabId) {
            if (!vocab[i].translationOverrides) vocab[i].translationOverrides = {};
            if (!vocab[i].translationOverrides[lang]) vocab[i].translationOverrides[lang] = {};
            vocab[i].translationOverrides[lang][field] = override;
            found = true;
            break;
          }
        }
        hexes[h].vocabulary = vocab;
        break;
      }
    }
    if (!found) throw new Error('Vocabulary entry not found');

    map.hexesJson = safeJsonStringify_(hexes, '[]');
    saveMap(map);

  } else {
    throw new Error('Either unitId or mapId+hexId is required');
  }

  return { success: true };
}

// ================================================
// DEFINITION LOOKUP
// ================================================

/**
 * Look up a word definition using the Free Dictionary API.
 * Called from frontend when teacher types a word and clicks "Lookup".
 * Uses UrlFetchApp (server-side) to avoid CORS.
 *
 * @param {string} word - English word to look up
 * @returns {Object} { success, term, definition, example, phonetic, partOfSpeech }
 */
function lookupDefinition(word) {
  if (!word || typeof word !== 'string') {
    return { success: false, message: 'Word is required' };
  }
  const trimmed = word.trim().toLowerCase();
  if (!trimmed || trimmed.length > 100) {
    return { success: false, message: 'Enter a valid word (max 100 characters)' };
  }

  const url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(trimmed);

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = response.getResponseCode();

    if (code === 404) {
      return { success: false, message: 'Word not found in dictionary' };
    }
    if (code !== 200) {
      return { success: false, message: 'Dictionary service unavailable (HTTP ' + code + ')' };
    }

    const data = JSON.parse(response.getContentText());
    if (!data || !data.length || !data[0].meanings || !data[0].meanings.length) {
      return { success: false, message: 'No definition found' };
    }

    const entry = data[0];
    const meaning = entry.meanings[0];
    const def = meaning.definitions && meaning.definitions[0] ? meaning.definitions[0] : {};

    return {
      success: true,
      term: entry.word || trimmed,
      definition: def.definition || '',
      example: def.example || '',
      phonetic: entry.phonetic || '',
      partOfSpeech: meaning.partOfSpeech || ''
    };
  } catch (err) {
    Logger.log('lookupDefinition error: ' + err.message);
    return { success: false, message: 'Lookup failed: ' + err.message };
  }
}

/**
 * Combined lookup + translate: fetches definition AND translates into all 4
 * target languages in a single RPC.  Returns everything the teacher needs to
 * preview before saving.
 *
 * @param {string} word - English word to look up
 * @returns {Object} { success, term, definition, example, phonetic,
 *                     partOfSpeech, translations: {lang: {term, definition}} }
 */
function lookupAndTranslate(word) {
  const lookup = lookupDefinition(word);
  if (!lookup || !lookup.success) {
    return lookup;                       // pass through error / not-found
  }

  // Translate term + definition into every target language
  const translations = {};
  for (let i = 0; i < VOCAB_TARGET_LANGUAGES.length; i++) {
    const lang = VOCAB_TARGET_LANGUAGES[i];
    try {
      translations[lang] = {
        term: translateText_(lookup.term, lang),
        definition: translateText_(lookup.definition, lang)
      };
    } catch (err) {
      translations[lang] = { term: '', definition: '', error: true };
    }
  }

  lookup.translations = translations;
  return lookup;
}

/**
 * Translate just a term into all 14 target languages (no definition lookup).
 * Used by the frontend for non-blocking translation preview after client-side
 * definition lookup.
 *
 * @param {string} word - English word to translate
 * @returns {Object} { lang: {term} } for each code in VOCAB_TARGET_LANGUAGES
 */
function translateTermPreview(word) {
  if (!word || typeof word !== 'string') return {};
  const trimmed = word.trim();
  if (!trimmed) return {};

  const translations = {};
  for (let i = 0; i < VOCAB_TARGET_LANGUAGES.length; i++) {
    const lang = VOCAB_TARGET_LANGUAGES[i];
    try {
      translations[lang] = { term: translateText_(trimmed, lang) };
    } catch (err) {
      translations[lang] = { term: '', error: true };
    }
  }
  return translations;
}

/**
 * Definition-only lookup with dual-API fallback.
 * Tries Free Dictionary API first, then Datamuse if that fails.
 * Used as backend fallback when client-side fetch is blocked.
 *
 * @param {string} word - English word to look up
 * @returns {Object} { success, term, definition, example, phonetic, partOfSpeech }
 */
function lookupDefinitionOnly(word) {
  // Try primary API first
  const primary = lookupDefinition(word);
  if (primary && primary.success) return primary;

  // Fallback: Datamuse API
  if (!word || typeof word !== 'string') {
    return { success: false, message: 'Word is required' };
  }
  const trimmed = word.trim().toLowerCase();
  if (!trimmed || trimmed.length > 100) {
    return primary || { success: false, message: 'Enter a valid word (max 100 characters)' };
  }

  const url = 'https://api.datamuse.com/words?sp=' + encodeURIComponent(trimmed) + '&md=d&max=1';
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      return primary || { success: false, message: 'Dictionary services unavailable' };
    }
    const data = JSON.parse(response.getContentText());
    if (!data || !data.length || !data[0].defs || !data[0].defs.length) {
      return primary || { success: false, message: 'Word not found' };
    }
    // Datamuse defs format: "n\tA building for worship"
    const defParts = data[0].defs[0].split('\t');
    const posCode = defParts[0] || '';
    const definition = defParts.length > 1 ? defParts[1] : defParts[0];
    const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
    return {
      success: true,
      term: data[0].word || trimmed,
      definition: definition,
      example: '',
      phonetic: '',
      partOfSpeech: posMap[posCode] || posCode
    };
  } catch (err) {
    Logger.log('lookupDefinitionOnly Datamuse error: ' + err.message);
    return primary || { success: false, message: 'All dictionary services failed' };
  }
}

// ================================================
// VALIDATION
// ================================================

/**
 * Validate a single vocabulary entry.
 *
 * @param {Object} entry - Raw vocab entry from client
 * @returns {Object} { entry, error }
 * @private
 */
function validateVocabEntry_(entry) {
  if (!entry || typeof entry !== 'object') {
    return { entry: null, error: 'Entry must be an object' };
  }

  const term = String(entry.term || '').trim();
  if (!term) {
    return { entry: null, error: 'Term is required' };
  }
  if (term.length > 100) {
    return { entry: null, error: 'Term must be 100 characters or fewer' };
  }

  const definition = String(entry.definition || '').trim();
  if (!definition) {
    return { entry: null, error: 'Definition is required' };
  }
  if (definition.length > 500) {
    return { entry: null, error: 'Definition must be 500 characters or fewer' };
  }

  const context = String(entry.context || '').trim().substring(0, 300);

  const validCategories = [
    'analysis', 'communication', 'scientific', 'mathematical',
    'research', 'reading', 'writing', 'processes', 'general', 'custom'
  ];
  const category = (entry.category && validCategories.indexOf(entry.category) !== -1)
    ? entry.category
    : 'custom';

  const validDisplayModes = ['full', 'word_only'];
  const displayMode = (entry.displayMode && validDisplayModes.indexOf(entry.displayMode) !== -1)
    ? entry.displayMode
    : 'full';

  const phonetic = String(entry.phonetic || '').trim().substring(0, 100);

  // Tier classification (1=everyday, 2=academic, 3=domain-specific)
  const validTiers = [1, 2, 3];
  const tier = (entry.tier && validTiers.indexOf(Number(entry.tier)) !== -1)
    ? Number(entry.tier)
    : 3; // Default: domain-specific (most common teacher use case)

  // Simplified definition for WIDA 1-2 students (optional)
  const simplifiedDefinition = String(entry.simplifiedDefinition || '').trim().substring(0, 300);

  return {
    entry: {
      vocabId: entry.vocabId || generateVocabId_(),
      term: term,
      definition: definition,
      context: context,
      category: category,
      displayMode: displayMode,
      phonetic: phonetic,
      tier: tier,
      simplifiedDefinition: simplifiedDefinition,
      translations: entry.translations || {},
      translationOverrides: entry.translationOverrides || {},
      addedBy: entry.addedBy || (Session.getActiveUser().getEmail() || ''),
      addedAt: entry.addedAt || now_()
    },
    error: null
  };
}

// ================================================
// LESSON CONTENT TRANSLATION (Projector Mode)
// ================================================

/**
 * Translate an array of text strings to a target language.
 * Used by Projector Mode to translate LIs, EQs, and vocabulary
 * for multilingual classroom display.
 *
 * @param {string[]} textsArray - Array of strings to translate (max 50 items, each max 500 chars)
 * @param {string} targetLang - Target language code (e.g. 'ja', 'es', 'zh')
 * @returns {Object} { translations: string[] } — same-index mapping
 */
function translateLessonContent(textsArray, targetLang) {
  requireRole(['administrator', 'teacher']);

  if (!Array.isArray(textsArray) || textsArray.length === 0) {
    throw new Error('textsArray must be a non-empty array');
  }
  if (textsArray.length > 50) {
    throw new Error('Maximum 50 items per translation request');
  }
  if (!targetLang || typeof targetLang !== 'string') {
    throw new Error('targetLang is required');
  }
  if (VOCAB_TARGET_LANGUAGES.indexOf(targetLang) === -1) {
    throw new Error('Invalid target language: ' + targetLang);
  }

  const translations = [];
  for (let i = 0; i < textsArray.length; i++) {
    const text = String(textsArray[i] || '').trim().substring(0, 500);
    if (!text) {
      translations.push('');
      continue;
    }
    try {
      translations.push(translateText_(text, targetLang));
    } catch (err) {
      Logger.log('translateLessonContent item ' + i + ' failed: ' + err.message);
      translations.push('');
    }
  }

  return { translations: translations };
}


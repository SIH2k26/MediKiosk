// =============================================================================
// MediKiosk — Structured Clinical History Questionnaire
// =============================================================================
// Declarative question definitions covering the full clinical history ontology:
// Chief Complaint → HPI → PMH → PSH → Medications → Allergies → Family →
// Personal → Review of Systems.
//
// Branching is declarative via `showIf` so definitions stay serializable and
// can later move to the database / admin configuration.
// =============================================================================

export type HistorySectionType =
  | 'CHIEF_COMPLAINT'
  | 'HPI'
  | 'PAST_MEDICAL_HISTORY'
  | 'PAST_SURGICAL_HISTORY'
  | 'MEDICATIONS'
  | 'ALLERGIES'
  | 'FAMILY_HISTORY'
  | 'PERSONAL_HISTORY'
  | 'REVIEW_OF_SYSTEMS';

export type QuestionType =
  | 'YES_NO'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'NUMBER'
  | 'DATE'
  | 'TEXT'
  | 'SCALE';

export interface BilingualText {
  en: string;
  hi: string;
}

export interface QuestionOption {
  value: string;
  en: string;
  hi: string;
  emoji?: string;
}

export interface ShowIfCondition {
  questionId: string;
  /** Show when the referenced answer equals this value… */
  equals?: string;
  /** …or when a multi-choice answer includes this value. */
  includes?: string;
}

export interface QuestionDef {
  id: string;
  section: HistorySectionType;
  type: QuestionType;
  text: BilingualText;
  options?: QuestionOption[];
  required: boolean;
  showIf?: ShowIfCondition;
  /** For NUMBER inputs */
  min?: number;
  max?: number;
}

export const SECTION_ORDER: HistorySectionType[] = [
  'CHIEF_COMPLAINT',
  'HPI',
  'PAST_MEDICAL_HISTORY',
  'PAST_SURGICAL_HISTORY',
  'MEDICATIONS',
  'ALLERGIES',
  'FAMILY_HISTORY',
  'PERSONAL_HISTORY',
  'REVIEW_OF_SYSTEMS',
];

export const SECTION_LABELS: Record<HistorySectionType, BilingualText> = {
  CHIEF_COMPLAINT: { en: 'Main Problem', hi: 'मुख्य समस्या' },
  HPI: { en: 'About Your Problem', hi: 'आपकी समस्या के बारे में' },
  PAST_MEDICAL_HISTORY: { en: 'Past Illnesses', hi: 'पुरानी बीमारियां' },
  PAST_SURGICAL_HISTORY: { en: 'Past Surgeries', hi: 'पुराने ऑपरेशन' },
  MEDICATIONS: { en: 'Medicines', hi: 'दवाइयां' },
  ALLERGIES: { en: 'Allergies', hi: 'एलर्जी' },
  FAMILY_HISTORY: { en: 'Family Health', hi: 'पारिवारिक स्वास्थ्य' },
  PERSONAL_HISTORY: { en: 'Lifestyle', hi: 'जीवनशैली' },
  REVIEW_OF_SYSTEMS: { en: 'Other Symptoms', hi: 'अन्य लक्षण' },
};

const NONE_OPTION: QuestionOption = { value: 'none', en: 'None of these', hi: 'इनमें से कोई नहीं', emoji: '✅' };

export const QUESTIONNAIRE: QuestionDef[] = [
  // --------------------------- CHIEF COMPLAINT ---------------------------
  {
    id: 'cc_main',
    section: 'CHIEF_COMPLAINT',
    type: 'SINGLE_CHOICE',
    text: { en: 'What is your main problem today?', hi: 'आज आपकी मुख्य समस्या क्या है?' },
    options: [
      { value: 'fever', en: 'Fever', hi: 'बुखार', emoji: '🤒' },
      { value: 'pain', en: 'Pain', hi: 'दर्द', emoji: '🤕' },
      { value: 'cough_cold', en: 'Cough / Cold', hi: 'खांसी / जुकाम', emoji: '🤧' },
      { value: 'breathing', en: 'Breathing difficulty', hi: 'सांस लेने में तकलीफ़', emoji: '💨' },
      { value: 'stomach', en: 'Stomach problem', hi: 'पेट की समस्या', emoji: '🤢' },
      { value: 'injury', en: 'Injury', hi: 'चोट', emoji: '🩹' },
      { value: 'other', en: 'Something else', hi: 'कुछ और', emoji: '❓' },
    ],
    required: true,
  },
  {
    id: 'cc_other_detail',
    section: 'CHIEF_COMPLAINT',
    type: 'TEXT',
    text: { en: 'Please describe your problem briefly.', hi: 'कृपया अपनी समस्या संक्षेप में बताएं।' },
    required: true,
    showIf: { questionId: 'cc_main', equals: 'other' },
  },
  {
    id: 'cc_duration',
    section: 'CHIEF_COMPLAINT',
    type: 'SINGLE_CHOICE',
    text: { en: 'How long have you had this problem?', hi: 'यह समस्या कितने समय से है?' },
    options: [
      { value: 'today', en: 'Started today', hi: 'आज से', emoji: '🆕' },
      { value: 'days', en: 'A few days', hi: 'कुछ दिनों से', emoji: '📅' },
      { value: 'weeks', en: '1–4 weeks', hi: '१–४ हफ्तों से', emoji: '🗓️' },
      { value: 'months', en: 'More than a month', hi: 'एक महीने से अधिक', emoji: '⏳' },
    ],
    required: true,
  },
  {
    id: 'cc_severity',
    section: 'CHIEF_COMPLAINT',
    type: 'SCALE',
    text: { en: 'How severe is it? (1 = mild, 10 = worst)', hi: 'यह कितनी गंभीर है? (१ = हल्की, १० = सबसे गंभीर)' },
    required: true,
    min: 1,
    max: 10,
  },

  // -------------------------------- HPI ---------------------------------
  {
    id: 'hpi_onset',
    section: 'HPI',
    type: 'SINGLE_CHOICE',
    text: { en: 'How did the problem start?', hi: 'समस्या कैसे शुरू हुई?' },
    options: [
      { value: 'sudden', en: 'Suddenly', hi: 'अचानक', emoji: '⚡' },
      { value: 'gradual', en: 'Slowly', hi: 'धीरे-धीरे', emoji: '🐢' },
    ],
    required: true,
  },
  {
    id: 'hpi_progression',
    section: 'HPI',
    type: 'SINGLE_CHOICE',
    text: { en: 'Is it getting better or worse?', hi: 'क्या यह बेहतर हो रही है या बदतर?' },
    options: [
      { value: 'better', en: 'Getting better', hi: 'बेहतर हो रही है', emoji: '📈' },
      { value: 'same', en: 'About the same', hi: 'वैसी ही है', emoji: '➡️' },
      { value: 'worse', en: 'Getting worse', hi: 'बदतर हो रही है', emoji: '📉' },
    ],
    required: true,
  },
  {
    id: 'hpi_associated',
    section: 'HPI',
    type: 'MULTI_CHOICE',
    text: { en: 'Do you also have any of these?', hi: 'क्या आपको इनमें से कुछ भी है?' },
    options: [
      { value: 'fever', en: 'Fever', hi: 'बुखार', emoji: '🤒' },
      { value: 'vomiting', en: 'Vomiting', hi: 'उल्टी', emoji: '🤢' },
      { value: 'dizziness', en: 'Dizziness', hi: 'चक्कर आना', emoji: '💫' },
      { value: 'sweating', en: 'Heavy sweating', hi: 'बहुत पसीना आना', emoji: '💦' },
      { value: 'breathlessness', en: 'Breathlessness', hi: 'सांस फूलना', emoji: '💨' },
      NONE_OPTION,
    ],
    required: true,
  },

  // ------------------------ PAST MEDICAL HISTORY ------------------------
  {
    id: 'pmh_conditions',
    section: 'PAST_MEDICAL_HISTORY',
    type: 'MULTI_CHOICE',
    text: { en: 'Do you have any of these conditions?', hi: 'क्या आपको इनमें से कोई बीमारी है?' },
    options: [
      { value: 'diabetes', en: 'Diabetes (sugar)', hi: 'मधुमेह (शुगर)', emoji: '🩸' },
      { value: 'hypertension', en: 'High blood pressure', hi: 'उच्च रक्तचाप (बीपी)', emoji: '❤️' },
      { value: 'asthma', en: 'Asthma', hi: 'दमा / अस्थमा', emoji: '🌬️' },
      { value: 'heart_disease', en: 'Heart disease', hi: 'हृदय रोग', emoji: '🩺' },
      { value: 'thyroid', en: 'Thyroid problem', hi: 'थायरॉइड की समस्या', emoji: '🧬' },
      { value: 'tb', en: 'Tuberculosis (TB)', hi: 'टीबी (क्षय रोग)', emoji: '🫁' },
      NONE_OPTION,
    ],
    required: true,
  },

  // ----------------------- PAST SURGICAL HISTORY ------------------------
  {
    id: 'psh_any',
    section: 'PAST_SURGICAL_HISTORY',
    type: 'YES_NO',
    text: { en: 'Have you ever had a surgery or operation?', hi: 'क्या आपका कभी कोई ऑपरेशन हुआ है?' },
    required: true,
  },
  {
    id: 'psh_details',
    section: 'PAST_SURGICAL_HISTORY',
    type: 'TEXT',
    text: { en: 'Which surgery did you have?', hi: 'कौन सा ऑपरेशन हुआ था?' },
    required: true,
    showIf: { questionId: 'psh_any', equals: 'yes' },
  },
  {
    id: 'psh_year',
    section: 'PAST_SURGICAL_HISTORY',
    type: 'NUMBER',
    text: { en: 'In which year was the surgery? (approximate)', hi: 'ऑपरेशन किस वर्ष हुआ था? (अनुमानित)' },
    required: false,
    showIf: { questionId: 'psh_any', equals: 'yes' },
    min: 1930,
    max: 2026,
  },

  // ----------------------------- MEDICATIONS ----------------------------
  {
    id: 'med_taking',
    section: 'MEDICATIONS',
    type: 'YES_NO',
    text: { en: 'Are you currently taking any medicines?', hi: 'क्या आप अभी कोई दवा ले रहे हैं?' },
    required: true,
  },
  {
    id: 'med_list',
    section: 'MEDICATIONS',
    type: 'TEXT',
    text: { en: 'Please tell us the medicine names (or show them at the counter).', hi: 'कृपया दवाओं के नाम बताएं (या काउंटर पर दिखाएं)।' },
    required: false,
    showIf: { questionId: 'med_taking', equals: 'yes' },
  },

  // ------------------------------ ALLERGIES -----------------------------
  {
    id: 'all_any',
    section: 'ALLERGIES',
    type: 'YES_NO',
    text: { en: 'Do you have any allergies?', hi: 'क्या आपको कोई एलर्जी है?' },
    required: true,
  },
  {
    id: 'all_types',
    section: 'ALLERGIES',
    type: 'MULTI_CHOICE',
    text: { en: 'What are you allergic to?', hi: 'आपको किस चीज़ से एलर्जी है?' },
    options: [
      { value: 'medicine', en: 'A medicine', hi: 'किसी दवा से', emoji: '💊' },
      { value: 'food', en: 'A food item', hi: 'किसी खाने की चीज़ से', emoji: '🍛' },
      { value: 'dust', en: 'Dust / pollen', hi: 'धूल / पराग', emoji: '🌾' },
      { value: 'other', en: 'Something else', hi: 'कुछ और', emoji: '❓' },
    ],
    required: true,
    showIf: { questionId: 'all_any', equals: 'yes' },
  },

  // ---------------------------- FAMILY HISTORY --------------------------
  {
    id: 'fh_conditions',
    section: 'FAMILY_HISTORY',
    type: 'MULTI_CHOICE',
    text: {
      en: 'Does anyone in your family have these conditions?',
      hi: 'क्या आपके परिवार में किसी को ये बीमारियां हैं?',
    },
    options: [
      { value: 'diabetes', en: 'Diabetes', hi: 'मधुमेह', emoji: '🩸' },
      { value: 'hypertension', en: 'High blood pressure', hi: 'उच्च रक्तचाप', emoji: '❤️' },
      { value: 'heart_disease', en: 'Heart disease', hi: 'हृदय रोग', emoji: '🩺' },
      { value: 'cancer', en: 'Cancer', hi: 'कैंसर', emoji: '🎗️' },
      NONE_OPTION,
    ],
    required: true,
  },

  // --------------------------- PERSONAL HISTORY -------------------------
  {
    id: 'ph_smoking',
    section: 'PERSONAL_HISTORY',
    type: 'SINGLE_CHOICE',
    text: { en: 'Do you smoke?', hi: 'क्या आप धूम्रपान करते हैं?' },
    options: [
      { value: 'never', en: 'Never', hi: 'कभी नहीं', emoji: '🚭' },
      { value: 'former', en: 'I used to, but quit', hi: 'पहले करता था, अब छोड़ दिया', emoji: '🚫' },
      { value: 'current', en: 'Yes, currently', hi: 'हां, अभी भी', emoji: '🚬' },
    ],
    required: true,
  },
  {
    id: 'ph_alcohol',
    section: 'PERSONAL_HISTORY',
    type: 'SINGLE_CHOICE',
    text: { en: 'Do you drink alcohol?', hi: 'क्या आप शराब पीते हैं?' },
    options: [
      { value: 'never', en: 'Never', hi: 'कभी नहीं', emoji: '🚱' },
      { value: 'occasional', en: 'Occasionally', hi: 'कभी-कभी', emoji: '🍺' },
      { value: 'regular', en: 'Regularly', hi: 'नियमित रूप से', emoji: '🍻' },
    ],
    required: true,
  },
  {
    id: 'ph_tobacco',
    section: 'PERSONAL_HISTORY',
    type: 'YES_NO',
    text: { en: 'Do you chew tobacco / gutkha?', hi: 'क्या आप तम्बाकू / गुटखा खाते हैं?' },
    required: true,
  },
  {
    id: 'ph_diet',
    section: 'PERSONAL_HISTORY',
    type: 'SINGLE_CHOICE',
    text: { en: 'What is your diet?', hi: 'आपका खान-पान कैसा है?' },
    options: [
      { value: 'vegetarian', en: 'Vegetarian', hi: 'शाकाहारी', emoji: '🥗' },
      { value: 'non_vegetarian', en: 'Non-vegetarian', hi: 'मांसाहारी', emoji: '🍗' },
      { value: 'eggetarian', en: 'Eggetarian', hi: 'अंडाहारी', emoji: '🥚' },
    ],
    required: true,
  },

  // ------------------------- REVIEW OF SYSTEMS --------------------------
  {
    id: 'ros_symptoms',
    section: 'REVIEW_OF_SYSTEMS',
    type: 'MULTI_CHOICE',
    text: {
      en: 'In the last month, have you had any of these?',
      hi: 'पिछले महीने में क्या आपको इनमें से कुछ हुआ है?',
    },
    options: [
      { value: 'chest_pain', en: 'Chest pain', hi: 'सीने में दर्द', emoji: '🩺' },
      { value: 'breathlessness', en: 'Breathlessness', hi: 'सांस फूलना', emoji: '💨' },
      { value: 'weight_loss', en: 'Weight loss', hi: 'वज़न घटना', emoji: '⚖️' },
      { value: 'appetite_loss', en: 'Loss of appetite', hi: 'भूख न लगना', emoji: '🍽️' },
      { value: 'sleep_problems', en: 'Sleep problems', hi: 'नींद की समस्या', emoji: '😴' },
      { value: 'urinary_problems', en: 'Urinary problems', hi: 'पेशाब की समस्या', emoji: '🚻' },
      NONE_OPTION,
    ],
    required: true,
  },
];

export type AnswerMap = Record<string, string>;

/** Evaluate a declarative visibility condition against collected answers. */
export function isQuestionVisible(question: QuestionDef, answers: AnswerMap): boolean {
  if (!question.showIf) return true;
  const answer = answers[question.showIf.questionId];
  if (answer === undefined) return false;
  if (question.showIf.equals !== undefined) return answer === question.showIf.equals;
  if (question.showIf.includes !== undefined) {
    return answer.split(',').map((v) => v.trim()).includes(question.showIf.includes);
  }
  return true;
}

/** Ordered list of questions that should currently be asked. */
export function getVisibleQuestions(answers: AnswerMap): QuestionDef[] {
  return QUESTIONNAIRE.filter((q) => isQuestionVisible(q, answers));
}

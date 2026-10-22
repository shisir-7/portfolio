// gpa-calculator file:// bundle — concatenated from calculator.js + subject-catalog.js + ui.js (no ES modules)
// Generated build; do not edit directly — edit sources and rebuild.
const GRADE_BANDS = Object.freeze([
  { min: 90, letter: "A+", gradePoint: 4.0 },
  { min: 80, letter: "A", gradePoint: 3.6 },
  { min: 70, letter: "B+", gradePoint: 3.2 },
  { min: 60, letter: "B", gradePoint: 2.8 },
  { min: 50, letter: "C+", gradePoint: 2.4 },
  { min: 40, letter: "C", gradePoint: 2.0 },
  { min: 30, letter: "D+", gradePoint: 1.8 },
  { min: 20, letter: "D", gradePoint: 1.6 },
  { min: 0, letter: "E", gradePoint: 0.8 }
]);

function getGrade(percentage) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Percentage must be a number between 0 and 100.");
  }
  return GRADE_BANDS.find(band => percentage >= band.min) ?? null;
}

function calculateSubject(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError("A subject must have at least one component.");
  }

  let obtainedTotal = 0;
  let fullMarksTotal = 0;
  let isNotGraded = false;
  let isIncomplete = false;

  const componentResults = components.map(component => {
    const { kind, obtained, fullMarks, minimumPassMarks = null, absent = false } = component;
    if (kind !== "theory" && kind !== "practical") {
      throw new TypeError("Component kind must be theory or practical.");
    }
    if (!Number.isFinite(fullMarks) || fullMarks <= 0
      || (minimumPassMarks !== null && (!Number.isFinite(minimumPassMarks)
        || minimumPassMarks < 0 || minimumPassMarks > fullMarks))) {
      throw new RangeError("Full marks and any pass marks must be valid.");
    }
    const missing = obtained === null || obtained === undefined;
    if (!absent && !missing && (!Number.isFinite(obtained) || obtained < 0 || obtained > fullMarks)) {
      throw new RangeError("Obtained marks must be between zero and full marks.");
    }

    if (absent) {
      isNotGraded = true;
    } else if (missing) {
      isIncomplete = true;
    }

    const validObtained = absent ? 0 : missing ? null : obtained;
    const percentage = missing ? null : (validObtained / fullMarks) * 100;
    const grade = percentage === null ? null : getGrade(percentage);
    const failedMinimum = !absent && minimumPassMarks !== null && validObtained < minimumPassMarks;
    if (failedMinimum || (!absent && percentage !== null && !grade)) isNotGraded = true;
    obtainedTotal += Number.isFinite(validObtained) ? validObtained : 0;
    fullMarksTotal += fullMarks;

    return {
      kind,
      obtained: Number.isFinite(validObtained) ? validObtained : null,
      fullMarks,
      minimumPassMarks,
      percentage,
      grade,
      absent,
      failedMinimum,
      status: absent ? "absent" : missing ? "incomplete" : failedMinimum ? "not-graded" : minimumPassMarks === null ? "pass-rule-unknown" : "assessed"
    };
  });

  const percentage = fullMarksTotal && !isIncomplete ? (obtainedTotal / fullMarksTotal) * 100 : null;
  const grade = percentage === null ? null : getGrade(percentage);
  if (grade === null && !isIncomplete) isNotGraded = true;

  return {
    obtained: obtainedTotal,
    fullMarks: fullMarksTotal,
    percentage,
    grade: isNotGraded ? null : grade,
    notGraded: isNotGraded,
    incomplete: isIncomplete,
    components: componentResults
  };
}

function calculateGPA(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new TypeError("At least one subject is required.");
  }

  if (subjects.some(({ gradePoint, creditHours }) => gradePoint === null || gradePoint === undefined
    || !Number.isFinite(creditHours) || creditHours <= 0)) {
    return null;
  }
  if (subjects.some(({ gradePoint }) => !Number.isFinite(gradePoint) || gradePoint < 0 || gradePoint > 4)) {
    throw new RangeError("Grade points must be between zero and four.");
  }
  if (subjects.some(({ notGraded, incomplete }) => notGraded || incomplete)) return null;

  const totalCredits = subjects.reduce((total, subject) => total + subject.creditHours, 0);
  const weightedPoints = subjects.reduce((total, subject) => total + subject.gradePoint * subject.creditHours, 0);
  return totalCredits ? Math.round((weightedPoints / totalCredits) * 100) / 100 : null;
}

function calculateMeanGPA(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new TypeError("At least one subject grade is required.");
  }
  if (subjects.some(s => s.gradePoint === null || s.gradePoint === undefined)) return null;
  if (subjects.some(s => !Number.isFinite(s.gradePoint) || s.gradePoint < 0 || s.gradePoint > 4)) {
    throw new RangeError("Grade points must be between zero and four.");
  }
  if (subjects.some(s => !Number.isFinite(s.weight) || s.weight <= 0)) {
    throw new RangeError("Weights must be positive numbers.");
  }
  const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = subjects.reduce((sum, s) => sum + s.gradePoint * s.weight, 0);
  return totalWeight ? Math.round((weightedSum / totalWeight + Number.EPSILON) * 100) / 100 : null;
}

function calculateCreditWeightedGPA(componentGrades) {
  if (!Array.isArray(componentGrades) || componentGrades.length === 0) {
    throw new TypeError("At least one component grade is required.");
  }
  const valid = componentGrades.filter(c => c.gradePoint !== null && c.gradePoint !== undefined);
  if (valid.length === 0) return null;
  if (valid.some(c => !Number.isFinite(c.gradePoint) || c.gradePoint < 0 || c.gradePoint > 4)) {
    throw new RangeError("Grade points must be between zero and four.");
  }
  if (valid.some(c => !Number.isFinite(c.creditHours) || c.creditHours <= 0)) {
    throw new RangeError("Credit hours must be positive numbers.");
  }
  if (valid.some(c => c.notGraded || c.incomplete)) return null;
  const totalCH = valid.reduce((sum, c) => sum + c.creditHours, 0);
  const weighted = valid.reduce((sum, c) => sum + c.gradePoint * c.creditHours, 0);
  return totalCH ? Math.round((weighted / totalCH + Number.EPSILON) * 100) / 100 : null;
}

function calculateComponentGradePoint(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError("At least one graded component is required.");
  }

  if (components.some(({ fullMarks }) => !Number.isFinite(fullMarks) || fullMarks <= 0)) {
    throw new RangeError("Component grade points and full marks must be valid.");
  }
  if (components.some(({ gradePoint }) => gradePoint === null || gradePoint === undefined)) return null;
  if (components.some(({ gradePoint }) => !Number.isFinite(gradePoint) || gradePoint < 0 || gradePoint > 4)) {
    throw new RangeError("Component grade points and full marks must be valid.");
  }

  const totalMarks = components.reduce((total, component) => total + component.fullMarks, 0);
  const weightedPoints = components.reduce(
    (total, component) => total + component.gradePoint * component.fullMarks,
    0
  );
  return weightedPoints / totalMarks;
}

function calculateAggregateTotals(subjects) {
  return subjectsForCalculation(subjects).reduce((totals, subject) => {
    const theory = subject.components.find(component => component.kind === "theory");
    const practical = subject.components.find(component => component.kind === "practical");
    const components = [
      { kind: "theory", value: theory },
      { kind: "practical", value: practical }
    ];

    for (const { kind, value } of components) {
      if (!value) continue;
      const maximum = Number(value.fullMarks);
      const isMissing = value.obtained === null || value.obtained === undefined || String(value.obtained).trim() === "";
      const obtained = isMissing ? null : Number(value.obtained);
      const hasMaximum = Number.isFinite(maximum) && maximum > 0;
      const hasObtained = value.absent || (!isMissing && Number.isFinite(obtained) && obtained >= 0 && obtained <= maximum);
      const maxKey = kind === "theory" ? "theoryMaximum" : "practicalMaximum";
      const markKey = kind === "theory" ? "theoryObtained" : "practicalObtained";
      const unknownKey = kind === "theory" ? "unknownTheoryComponents" : "unknownPracticalComponents";
      if (hasMaximum) totals[maxKey] += maximum;
      else totals[unknownKey] += 1;
      if (hasMaximum && hasObtained) totals[markKey] += value.absent ? 0 : obtained;
      else if (hasMaximum) totals.incompleteComponents += 1;
    }

    totals.subjects += 1;
    if (subject.verification === "custom") totals.customSubjects += 1;
    else if (subject.verification === "verified-current") totals.currentlyVerifiedSubjects += 1;
    else totals.historicalOrUnverifiedSubjects += 1;
    return totals;
  }, {
    theoryMaximum: 0,
    theoryObtained: 0,
    practicalMaximum: 0,
    practicalObtained: 0,
    unknownTheoryComponents: 0,
    unknownPracticalComponents: 0,
    subjects: 0,
    customSubjects: 0,
    currentlyVerifiedSubjects: 0,
    historicalOrUnverifiedSubjects: 0,
    incompleteComponents: 0
  });
}

const LEGACY_DISTRIBUTION_SOURCE = Object.freeze({
  title: "Internal (Practical) Marks Evaluation Scheme and Subject-wise Distribution of Theoretical & Internal (Practical) Marks, 2078",
  url: "https://biratnagar.neb.gov.np/get-file/downloads/Downloads-202603251316403780.pdf",
  year: "2078",
  checkedOn: "2026-10-17",
  status: "Official NEB document; the document itself is dated 2078. Current applicability is unverified."
});

const SEE_FRAMEWORK_SOURCE = Object.freeze({
  title: "Assessment Framework for Secondary Education Examination (SEE)",
  url: "https://neb.gov.np/neb-notice-file/Notices-202610011508438468.pdf",
  year: "2025-04",
  checkedOn: "2026-10-18",
  status: "Official NEB framework, April 2025. It verifies 75 external and 25 internal marks for English, Mathematics, Science and Technology, and Social Studies. It does not cover Nepali or specify current component pass thresholds."
});

const historicalRows = `
Com. Nepali|0011|0021|75|25|75|25
Com. English|0031|0041|75|25|75|25
Com. Social Studies & Life Skill|0051|0061|75|25|75|25
Com. Mathematics|0071|0081|75|25|75|25
Sanskrit Rachana|0111|0121|75|25|75|25
Sanskrit Bhasha & Byakaran|0171|0181|75|25|75|25
Baudh Education|0211|0221|75|25|75|25
Urdu Byakaran & Sahitya|0311|0321|75|25|75|25
Physics|1011|1021|75|25|75|25
Accounting|1031|1041|75|25|75|25
Rural Development|1051|1061|75|25|75|25
Jurisprudence and Legal Theories|1071|1101|75|25|75|25
Painting|1111|1121|50|50|50|50
Child Development and Learning|1151||75|25||
Instructional Pedagogy and Evaluation||1181|||75|25
Psychology|1191|1201|75|25|75|25
History|1211|1221|75|25|75|25
Gender Studies|1231|1241|75|25|75|25
Hospitality Management|1251|1261|50|50|50|50
Agronomy|1271|1281|50|50|50|50
Naturopathy|1291|1301|50|50|50|50
Human Value Education|1311|1321|75|25|75|25
Biology|2011|2021|75|25|75|25
Education and Development|2031|2041|75|25|75|25
Geography|2051|2061|75|25|75|25
Procedural Law|2071||75|25||
Legal Drafting||2101|||50|50
Sociology|2111|2121|75|25|75|25
Ayurveda|2131|2141|50|50|50|50
Business Studies|2151|2161|75|25|75|25
Linguistics|2171|2181|75|25|75|25
Political Science|2191|2201|75|25|75|25
Philosophy|2211|2221|75|25|75|25
Population Studies|2231|2241|75|25|75|25
Horticulture (Fruit, Vegetable, Flower & Mushroom)|2251|2261|75|25|75|25
Food and Nutrition|2271|2281|75|25|75|25
Dance|2291|2301|50|50|50|50
History of Arts|2311|2321|50|50|50|50
Chemistry|3011|3021|75|25|75|25
Economics|3031|3041|75|25|75|25
Tourism and Mountaineering Studies|3051|3061|50|50|50|50
Marketing|3071|3081|75|25|75|25
Gerontology and Care Taking Education|3091|3101|75|25|75|25
Yog|3111|3121|50|50|50|50
Vocal/Instrumental|3131|3141|50|50|50|50
Sewing and Knitting|3151|3161|75|25|75|25
Constitutional Law|3171||75|25||
Civil and Criminal Law and Justice||3201|||75|25
Culinary Arts|3211|3221|50|50|50|50
Culture|3231|3241|75|25|75|25
Fashion Designing|3251|3261|50|50|50|50
Film and Documentary|3271|3281|75|25|75|25
Livestock, Poultry and Fish Farming|3291|3301|50|50|50|50
Nepali|3311|3321|75|25|75|25
English|3331|3341|75|25|75|25
Maithili|3351|3361|75|25|75|25
Newari|3371|3381|75|25|75|25
Hindi|3391|3401|75|25|75|25
Chinese|3411|3421|75|25|75|25
German|3431|3441|75|25|75|25
Japanese|3451|3461|75|25|75|25
Korean|3471|3481|75|25|75|25
Urdu|3491|3501|75|25|75|25
Bhojpuri|3511|3521|75|25|75|25
French|3531|3541|75|25|75|25
Hebrew|3551|3561|75|25|75|25
Arabic|3571|3581|75|25|75|25
Sanskrit|3591|3601|75|25|75|25
Applied Arts|3611|3621|50|50|50|50
Mathematics|4011|4021|75|25|75|25
Applied Mathematics|4031|4041|75|25|75|25
Business Mathematics|4051|4061|75|25|75|25
Human Rights|4071|4081|75|25|75|25
Library and Information Science|4091|4101|75|25|75|25
Home Science|4111|4121|75|25|75|25
Environment Science|4131|4141|75|25|75|25
General Law|4151|4161|75|25|75|25
Finance|4171|4181|75|25|75|25
Co-operative Management|4191|4201|75|25|75|25
Buddhist Studies|4211|4221|75|25|75|25
Sculpture|4231|4241|50|50|50|50
Singing|4251|4261|50|50|50|50
Computer Science|4271|4281|50|50|50|50
Sericulture and Bee Keeping|4291|4301|50|50|50|50
Beautician and Hair Dressing|4311|4321|50|50|50|50
Medicinal Herbals|4331|4341|50|50|50|50
Plumbing and Wiring|4351|4361|50|50|50|50
Internal Decoration|4371|4381|75|25|75|25
Hotel Management|4391|4401|50|50|50|50
Mass Communication|4411|4421|75|25|75|25
Health and Physical Education|4431|4441|75|25|75|25
Sports Science|4451|4461|50|50|50|50
Social Studies & Life Skill Education|4471|4481|75|25|75|25
Shuklayajurveda|5011|5021|75|25|75|25
Samaveda|5031|5041|75|25|75|25
Rigveda|5051|5061|75|25|75|25
Atharvaveda|5071|5081|75|25|75|25
Grammar|5091|5101|75|25|75|25
Siddhanta Jyotish|5111|5121|75|25|75|25
Nyaya|5131|5141|75|25|75|25
Philosophy (Sanskrit)|5151|5161|75|25|75|25
Sanskrit Sahitya|5171|5181|75|25|75|25
Itihas Puran|5191|5201|75|25|75|25
Nitishastra|5211|5221|75|25|75|25
Baudh Karma Kanda|5271|5281|75|25|75|25
Karmakand|5311|5321|75|25|75|25
Falit Jyotish|5331|5341|75|25|75|25
Bastushastra|5371|5381|75|25|75|25
Baudh Darshan|6011|6021|75|25|75|25
Kuran|6111|6121|75|25|75|25
Jyotish|6211|6221|75|25|75|25
Bhaisajya|6231|6241|75|25|75|25
Shilpa Vidhya|6251|6261|75|25|75|25
Pali Language|6311|6321|75|25|75|25
Bhot Language|6331|6341|75|25|75|25
Hadis & Asule Hadis|6511|6521|75|25|75|25
Miras Science|6611|6621|75|25|75|25
`;

function defaultCreditHours(theoryMaximum, practicalMaximum, name) {
  if (name === "English" || name === "Com. English") return { theory: 3.0, practical: 1.0 };
  if (name === "Nepali" || name === "Com. Nepali") return { theory: 2.25, practical: 0.75 };
  if (theoryMaximum === 75 && practicalMaximum === 25) return { theory: 3.0, practical: 1.0 };
  if (theoryMaximum === 50 && practicalMaximum === 50) return { theory: 2.0, practical: 2.0 };
  if (theoryMaximum !== null && practicalMaximum !== null) {
    const total = 4.0;
    const th = (theoryMaximum / (theoryMaximum + practicalMaximum)) * total;
    const pr = total - th;
    return { theory: Math.round(th * 100) / 100, practical: Math.round(pr * 100) / 100 };
  }
  if (theoryMaximum !== null) return { theory: 3.0, practical: 0 };
  if (practicalMaximum !== null) return { theory: 0, practical: 1.0 };
  return { theory: 0, practical: 0 };
}

const SEE_SUBJECTS = [
  {
    name: "English",
    aliases: ["Compulsory English"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "compulsory"
  },
  {
    name: "Nepali",
    aliases: ["Compulsory Nepali"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 2.25,
    practicalCreditHours: 0.75,
    assessmentVerification: "verified-current",
    type: "compulsory"
  },
  {
    name: "Mathematics",
    aliases: ["Math", "Compulsory Mathematics"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "compulsory"
  },
  {
    name: "Science and Technology",
    aliases: ["Science", "Science & Technology"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "compulsory"
  },
  {
    name: "Social Studies",
    aliases: ["Social Studies and Human Values Education"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "compulsory"
  },
  {
    name: "Optional Mathematics",
    aliases: ["Opt Math", "Optional Math"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "elective"
  },
  {
    name: "Health and Physical Education",
    aliases: ["Health", "Physical Education", "HPE"],
    theoryMaximum: 50,
    practicalMaximum: 50,
    theoryCreditHours: 2.0,
    practicalCreditHours: 2.0,
    assessmentVerification: "verified-current",
    type: "elective"
  },
  {
    name: "Computer Science",
    aliases: ["CS", "Computing"],
    theoryMaximum: 50,
    practicalMaximum: 50,
    theoryCreditHours: 2.0,
    practicalCreditHours: 2.0,
    assessmentVerification: "verified-current",
    type: "elective"
  },
  {
    name: "Accounting",
    aliases: ["Accountancy"],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "elective"
  },
  {
    name: "Economics",
    aliases: [],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "elective"
  },
  {
    name: "Business Studies",
    aliases: [],
    theoryMaximum: 75,
    practicalMaximum: 25,
    theoryCreditHours: 3.0,
    practicalCreditHours: 1.0,
    assessmentVerification: "verified-current",
    type: "elective"
  }
];

const SUBJECT_ALIASES = Object.freeze({
  "Com. Nepali": ["Compulsory Nepali"],
  "Com. English": ["Compulsory English"],
  "Com. Social Studies & Life Skill": ["Compulsory Social Studies", "Social Studies and Life Skills"],
  "Com. Mathematics": ["Compulsory Mathematics", "Compulsory Math"],
  "Accounting": ["Accountancy"],
  "Computer Science": ["CS", "Computing"],
  "Physics": ["Physical Science"],
  "Biology": ["Biological Science"],
  "Chemistry": ["Chemical Science"],
  "Mathematics": ["Math", "Mathematical Studies"],
  "Sanskrit Bhasha & Byakaran": ["Sanskrit Language and Grammar"],
  "Jurisprudence and Legal Theories": ["Jurisprudence"],
  "Tourism and Mountaineering Studies": ["Tourism", "Mountaineering"],
  "Vocal/Instrumental": ["Music", "Vocal and Instrumental"],
  "Maithili": ["Maithali"],
  "Newari": ["Nepal Bhasa"],
  "Environment Science": ["Environmental Science"],
  "Co-operative Management": ["Cooperative Management"],
  "Hotel Management": ["Hospitality Management"],
  "Film and Documentary": ["Film and Documentary Studies"],
  "Ayurveda": ["Ayurbed"],
  "Philosophy (Sanskrit)": ["Phyloshophy"],
  "Siddhanta Jyotish": ["Sidhant Jyotish"],
  "Shuklayajurveda": ["Shuklayajurbed"],
  "Samaveda": ["Sambed"],
  "Rigveda": ["Rigbed"],
  "Atharvaveda": ["Atharbed"]
});

function legacyRecord(line, level) {
  const [name, xiCode, xiiCode, xiTheory, xiPractical, xiiTheory, xiiPractical] = line.split("|");
  const theory = level === "XI" ? xiTheory : xiiTheory;
  const practical = level === "XI" ? xiPractical : xiiPractical;
  if (!theory && !practical) return null;

  const code = level === "XI" ? xiCode : xiiCode;
  const theoryMaxNum = theory ? Number(theory) : null;
  const practicalMaxNum = practical ? Number(practical) : null;
  const creditHours = defaultCreditHours(theoryMaxNum, practicalMaxNum, name);
  return Object.freeze({
    id: `neb-${level.toLowerCase()}-${code || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases: SUBJECT_ALIASES[name] ?? [],
    level,
    subjectCode: code || null,
    programme: null,
    subjectGroup: name.startsWith("Com. ") ? "compulsory-in-source" : "not-classified-in-source",
    selectionType: name.startsWith("Com. ") ? "compulsory-in-source" : "unknown",
    theoryMaximum: theoryMaxNum,
    practicalMaximum: practicalMaxNum,
    totalMaximum: (theory ? Number(theory) : 0) + (practical ? Number(practical) : 0),
    theoryPassMarks: null,
    practicalPassMarks: null,
    creditHours: (creditHours.theory + creditHours.practical) || null,
    theoryCreditHours: creditHours.theory || null,
    practicalCreditHours: creditHours.practical || null,
    curriculumYear: "2078",
    applicabilityAfterYear: null,
    calculationPolicy: "unverified-current",
    source: LEGACY_DISTRIBUTION_SOURCE,
    verification: "historical-official-distribution-current-validity-unverified",
    type: name.startsWith("Com. ") ? "compulsory" : "elective"
  });
}

const NEB_XI_XII_CATALOGUE = Object.freeze(
  historicalRows.trim().split("\n").flatMap(line => ["XI", "XII"].map(level => legacyRecord(line, level)).filter(Boolean))
);

const SEE_CATALOGUE = Object.freeze(SEE_SUBJECTS.map(subject => Object.freeze({
  id: `see-${subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name: subject.name,
  aliases: subject.aliases,
  level: "SEE",
  subjectCode: null,
  programme: null,
  subjectGroup: "not-classified-in-framework",
  selectionType: "unverified",
  theoryMaximum: subject.theoryMaximum,
  practicalMaximum: subject.practicalMaximum,
  totalMaximum: subject.theoryMaximum === null || subject.practicalMaximum === null
    ? null : subject.theoryMaximum + subject.practicalMaximum,
  theoryPassMarks: null,
  practicalPassMarks: null,
  creditHours: null,
  theoryCreditHours: null,
  practicalCreditHours: null,
  curriculumYear: "2025",
  applicabilityAfterYear: null,
  calculationPolicy: "unverified",
  source: SEE_FRAMEWORK_SOURCE,
  verification: subject.assessmentVerification,
  type: subject.type
})));

const SUBJECT_CATALOGUE = Object.freeze([...SEE_CATALOGUE, ...NEB_XI_XII_CATALOGUE]);

function createSubjectCatalogueAudit() {
  return ["SEE", "XI", "XII"].map(level => {
    const subjects = SUBJECT_CATALOGUE.filter(subject => subject.level === level);
    const withDistribution = subjects.filter(subject => subject.theoryMaximum !== null || subject.practicalMaximum !== null);
    const countDistribution = (theory, practical) => withDistribution.filter(subject =>
      subject.theoryMaximum === theory && subject.practicalMaximum === practical).length;
    return {
      level,
      checked: subjects.length,
      historicalOfficialDistributions: subjects.filter(subject =>
        subject.verification === "historical-official-distribution-current-validity-unverified").length,
      currentlyVerified: subjects.filter(subject => subject.verification === "verified-current").length,
      seventyFiveTwentyFive: countDistribution(75, 25),
      fiftyFifty: countDistribution(50, 50),
      otherDistributions: withDistribution.length
        - countDistribution(75, 25) - countDistribution(50, 50),
      requiringResearch: subjects.filter(subject =>
        subject.theoryMaximum === null || subject.theoryPassMarks === null
        || subject.creditHours === null || subject.applicabilityAfterYear === null).length
    };
  });
}

const SUBJECT_SOURCE_REGISTRY = Object.freeze([
  LEGACY_DISTRIBUTION_SOURCE,
  SEE_FRAMEWORK_SOURCE,
  Object.freeze({
    title: "National Assessment Framework for Grade 12 (draft)",
    url: "https://neb.gov.np/neb-notice-file/Notices-202610011512454018.pdf",
    year: "2023-08",
    checkedOn: "2026-10-18",
    status: "Official NEB draft; its cover requests reader comments. Not used as a current marks-distribution authority."
  }),
  Object.freeze({
    title: "Curriculum Development Centre website",
    url: "https://moecdc.gov.np/",
    year: "accessed-2026-10-17",
    checkedOn: "2026-10-17",
    status: "Official curriculum portal reachable. A complete Grade 10/11/12 subject-code, assessment, credit and pass-mark matrix was not verified."
  }),
  Object.freeze({
    title: "SEE 2082 subject-registration notice",
    url: "https://see.gov.np/content/7/notice-regarding-subject-registration/",
    year: "2082",
    checkedOn: "2026-10-17",
    status: "Official SEE notice reviewed; it did not provide an accessible full subject-wise marks/code table."
  }),
  Object.freeze({
    title: "NEB Class 12 GPA calculator (independent cross-check)",
    url: "https://neb.collegeinfonepal.com/neb",
    year: "accessed-2026-10-17",
    checkedOn: "2026-10-17",
    status: "Independent calculator reviewed as a cross-check only; not treated as an official curriculum source."
  })
]);

const CATALOGUE_CAVEATS = Object.freeze({
  lastChecked: "2026-10-17",
  currentComplete: false,
  notes: [
    "The Grade XI/XII distribution table is in an official NEB document dated 2078; current applicability is not confirmed.",
    "The table has no credit hours or component passing marks.",
    "The SEE assessment framework dated April 2025 is not a complete current subject-code or marks-distribution catalogue.",
    "Programme/faculty classifications and approved subject combinations are not encoded unless stated in a cited official source.",
    "Unverified or custom values must not be described as official results."
  ]
});

const CUSTOM_STORAGE_KEY = "neb-gpa-custom-subjects-v1";
const grades = [
  { letter: "A+", gradePoint: 4.0 }, { letter: "A", gradePoint: 3.6 },
  { letter: "B+", gradePoint: 3.2 }, { letter: "B", gradePoint: 2.8 },
  { letter: "C+", gradePoint: 2.4 }, { letter: "C", gradePoint: 2.0 },
  { letter: "D+", gradePoint: 1.8 }, { letter: "D", gradePoint: 1.6 },
  { letter: "E", gradePoint: 0.8 }
];

const text = {
  en: {
    appName: "NEB GPA Calculator", reset: "Reset", studentName: "Student Name (Optional)",
    classLabel: "Class / Level", chooseLevel: "Choose level", class10: "Class 10 · SEE",
    class11: "+2 (NEB)", class12: "+2 (NEB)", plus2: "+2 (NEB)", streamLabel: "Stream", science: "Science",
    management: "Management", humanities: "Humanities", law: "Law", technical: "Technical / Vocational",
    other: "Other", marksMode: "Enter Exact Marks", gradesMode: "Enter Letter Grades",
    addSubject: "Add subject", theory: "Theory", practical: "Practical / Internal",
    theoryGrade: "Theory grade", practicalGrade: "Practical / Internal grade",
    subjectGrade: "Subject grade", marksObtained: "Marks obtained", chooseGrade: "Choose grade", searchSubjects: "Search subjects",
    customSubject: "Create custom subject", subjectName: "Subject name", theoryMaximum: "Theory maximum",
    practicalMaximum: "Practical maximum", saveSubject: "Save subject", remove: "Remove",
    selected: "Added", add: "Add", none: "No subjects selected",
    unknown: "Max unknown", overallGpa: "Indicative GPA", overallGrade: "Overall Grade",
    ready: "Equal-weight estimate", readyPartial: "Indicative GPA based on {count} completed subject(s).", incomplete: "Enter all available marks or grades to see GPA",
    unknownMarks: "Enter letter grades for subjects without known marks maxima",
    invalidMarks: "Marks must be between zero and the maximum",
    ng: "NG subject selected", chooseLevelStatus: "Choose a class to begin",
    customError: "Enter a subject name and at least one positive marks maximum.",
    copied: "Subject saved", sourceLabel: "Max",
    chooseElectives: "Choose your electives",
    chooseElectivesSEE: "Choose 2 optional subjects",
    chooseElectivesScience: "Choose 1 optional subject (Biology or Computer Science)",
    chooseElectivesManagement: "Choose 1 optional subject",
    chooseElectivesHumanities: "Choose 1 optional subject",
    chooseElectivesLaw: "Choose 1 optional subject",
    chooseElectivesTechnical: "Choose 1 optional subject",
    chooseElectivesOther: "Choose 1 optional subject",
    electiveOptional: "Optional",
    useThisInstead: "Use this instead",
    excludedAlternative: "Not part of this combination"
  },

  ne: {
    appName: "NEB GPA क्याल्कुलेटर", reset: "रिसेट", studentName: "विद्यार्थीको नाम (ऐच्छिक)",
    classLabel: "कक्षा / तह", chooseLevel: "कक्षा छान्नुहोस्", class10: "कक्षा १० · SEE",
    class11: "+2 (NEB)", class12: "+2 (NEB)", plus2: "+2 (NEB)", streamLabel: "सङ्काय", science: "विज्ञान",
    management: "व्यवस्थापन", humanities: "मानविकी", law: "कानुन", technical: "प्राविधिक / व्यावसायिक",
    other: "अन्य", marksMode: "प्राप्ताङ्क भर्नुहोस्", gradesMode: "अक्षर ग्रेड भर्नुहोस्",
    addSubject: "विषय थप्नुहोस्", theory: "सैद्धान्तिक", practical: "प्रयोगात्मक / आन्तरिक",
    theoryGrade: "सैद्धान्तिक ग्रेड", practicalGrade: "प्रयोगात्मक / आन्तरिक ग्रेड",
    subjectGrade: "विषय ग्रेड", marksObtained: "प्राप्ताङ्क", chooseGrade: "ग्रेड छान्नुहोस्", searchSubjects: "विषय खोज्नुहोस्",
    customSubject: "आफ्नो विषय बनाउनुहोस्", subjectName: "विषयको नाम", theoryMaximum: "सैद्धान्तिक पूर्णाङ्क",
    practicalMaximum: "प्रयोगात्मक पूर्णाङ्क", saveSubject: "विषय सुरक्षित गर्नुहोस्", remove: "हटाउनुहोस्",
    selected: "थपिएको", add: "थप्नुहोस्", none: "विषय छानिएको छैन",
    unknown: "पूर्णाङ्क अज्ञात", overallGpa: "अनुमानित GPA", overallGrade: "समग्र ग्रेड",
    ready: "समान भारको अनुमान", readyPartial: "पूरा भएका {count} वटा विषयमा आधारित अनुमानित GPA.", incomplete: "GPA हेर्न सबै उपलब्ध प्राप्ताङ्क वा ग्रेड भर्नुहोस्",
    unknownMarks: "पूर्णाङ्क अज्ञात भएका विषयका लागि अक्षर ग्रेड भर्नुहोस्",
    invalidMarks: "प्राप्ताङ्क शून्यदेखि पूर्णाङ्कसम्म हुनुपर्छ",
    ng: "NG विषय छानिएको छ", chooseLevelStatus: "सुरु गर्न कक्षा छान्नुहोस्",
    customError: "विषयको नाम र कम्तीमा एउटा धनात्मक पूर्णाङ्क भर्नुहोस्.",
    copied: "विषय सुरक्षित भयो", sourceLabel: "पूर्णाङ्क",
    chooseElectives: "आफ्नो ऐच्छिक विषयहरू छान्नुहोस्",
    chooseElectivesSEE: "२ वटा ऐच्छिक विषय छान्नुहोस्",
    chooseElectivesScience: "१ वटा ऐच्छिक विषय छान्नुहोस् (जीवविज्ञान वा कम्प्युटर विज्ञान)",
    chooseElectivesManagement: "१ वटा ऐच्छिक विषय छान्नुहोस्",
    chooseElectivesHumanities: "१ वटा ऐच्छिक विषय छान्नुहोस्",
    chooseElectivesLaw: "१ वटा ऐच्छिक विषय छान्नुहोस्",
    chooseElectivesTechnical: "१ वटा ऐच्छिक विषय छान्नुहोस्",
    chooseElectivesOther: "१ वटा ऐच्छिक विषय छान्नुहोस्",
    electiveOptional: "ऐच्छिक",
    useThisInstead: "यसलाई प्रयोग गर्नुहोस्",
    excludedAlternative: "यो संयोजनमा समावेश छैन"
  }
};


function getPresets() {
  return {
    see: {
      compulsory: ["English", "Nepali", "Mathematics", "Science and Technology", "Social Studies"],
      elective: ["Optional Mathematics", "Health and Physical Education", "Computer Science", "Accounting", "Economics", "Business Studies"],
      electiveLabel: t("chooseElectivesSEE"),
      maxElectives: 2
    },
    "12": {
      science: { compulsory: ["English", "Nepali", "Mathematics", "Physics", "Chemistry", "Social Studies & Life Skill Education"], elective: ["Biology", "Computer Science"], electiveLabel: t("chooseElectivesScience"), maxElectives: 1 },
      management: { compulsory: ["English", "Nepali", "Accounting", "Economics", "Mathematics", "Social Studies & Life Skill Education"], elective: ["Business Studies", "Finance"], electiveLabel: t("chooseElectivesManagement"), maxElectives: 1 },
      humanities: { compulsory: ["English", "Nepali", "History", "Geography"], elective: ["Sociology", "Rural Development"], electiveLabel: t("chooseElectivesHumanities"), maxElectives: 1 },
      law: { compulsory: ["English", "Nepali", "Jurisprudence and Legal Theories", "Legal Drafting", "Civil and Criminal Law and Justice", "General Law"], elective: ["Procedural Law"], electiveLabel: t("chooseElectivesLaw"), maxElectives: 1 },
      technical: { compulsory: ["English", "Nepali", "Mathematics", "Physics", "Chemistry"], elective: ["Computer Science", "Hotel Management", "Culinary Arts", "Tourism and Mountaineering Studies"], electiveLabel: t("chooseElectivesTechnical"), maxElectives: 1 },
      other: { compulsory: ["English", "Nepali", "Mathematics", "Physics", "Chemistry"], elective: ["Psychology", "Geography", "History", "Economics"], electiveLabel: t("chooseElectivesOther"), maxElectives: 1 }
    }
  };
}

const levelSelect = document.getElementById("class-level-dropdown");
const streamSelect = document.getElementById("stream-dropdown");
const levelTrigger = levelSelect ? levelSelect.querySelector(".dropdown-trigger") : null;
const streamTrigger = streamSelect ? streamSelect.querySelector(".dropdown-trigger") : null;
const streamField = document.getElementById("stream-field");
const nameInput = document.getElementById("student-name");
const subjectList = document.getElementById("subjects");
const statusElement = document.getElementById("result-status");
const gpaElement = document.getElementById("live-gpa");
const gradeElement = document.getElementById("live-grade");
const downloadButton = document.getElementById("download-pdf");
const dialog = document.getElementById("subject-dialog");
const searchInput = document.getElementById("catalogue-search");
const catalogueResults = document.getElementById("catalogue-results");
const customForm = document.getElementById("custom-subject-form");
const customError = document.getElementById("custom-error");
const marksModeButton = document.getElementById("marks-mode");
const gradesModeButton = document.getElementById("grades-mode");
const themeToggleButton = document.getElementById("theme-toggle");
let language = "en";
let mode = "marks";
let selectedSubjects = [];
let subjectSequence = 0;
let lastAcademicStream = "science";

const getLevelValue = () => levelTrigger?.getAttribute("data-value") || "";
const getStreamValue = () => streamTrigger?.getAttribute("data-value") || "science";

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", theme === "dark" ? "#10100F" : "#F7F5F0");
  if (!themeToggleButton) return;
  themeToggleButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  themeToggleButton.innerHTML = theme === "dark"
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

let initialTheme = "light";
try {
  const savedTheme = localStorage.getItem("sa-theme");
  initialTheme = savedTheme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch (e) {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) initialTheme = "dark";
}
setTheme(initialTheme);
if (themeToggleButton) themeToggleButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  try { localStorage.setItem("sa-theme", nextTheme); } catch (e) {}
});

const t = key => text[language][key] ?? text.en[key] ?? key;
const normalizeLevel = level => level === "XI" || level === "XII" || level === "11" ? "12" : level;
const safe = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const displayName = name => String(name).replace(/^Com\.\s*/, "Compulsory ");

function initCustomDropdown(dropdownElement, onChange) {
  if (!dropdownElement) return;
  const trigger = dropdownElement.querySelector(".dropdown-trigger");
  const menu = dropdownElement.querySelector(".dropdown-menu");
  if (!trigger || !menu) return;
  if (trigger.dataset.bound === "1") return;
  trigger.dataset.bound = "1";
  const textSpan = trigger.querySelector(".dropdown-text");

  function getSelectedOption() {
    const val = trigger.getAttribute("data-value");
    return menu.querySelector(`.dropdown-option[data-value="${val}"]`) || menu.querySelector(".dropdown-option");
  }

  function updateTriggerDisplay() {
    const opt = getSelectedOption();
    if (opt) {
      if (textSpan) {
        if (opt.hasAttribute("data-i18n")) {
          textSpan.textContent = t(opt.getAttribute("data-i18n"));
          textSpan.setAttribute("data-i18n", opt.getAttribute("data-i18n"));
        } else {
          textSpan.textContent = opt.textContent;
          textSpan.removeAttribute("data-i18n");
        }
      } else {
        trigger.textContent = opt.textContent;
      }
    }
  }

  const toggle = () => {
    const isOpen = dropdownElement.classList.contains("is-open");
    document.querySelectorAll(".custom-dropdown.is-open").forEach(d => {
      d.classList.remove("is-open");
      d.setAttribute("aria-expanded", "false");
      const m = d.querySelector(".dropdown-menu");
      if (m) m.hidden = true;
    });
    if (!isOpen) {
      dropdownElement.classList.add("is-open");
      dropdownElement.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      const val = trigger.getAttribute("data-value");
      menu.querySelectorAll(".dropdown-option").forEach(opt => {
        const isSelected = opt.getAttribute("data-value") === val;
        opt.setAttribute("aria-selected", String(isSelected));
        opt.classList.toggle("is-active", isSelected);
      });
    }
  };

  trigger.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });
  dropdownElement.addEventListener("click", e => {
    if (e.target.closest(".dropdown-menu")) return;
    if (e.target === dropdownElement || e.target.closest(".custom-dropdown") === dropdownElement && !e.target.closest(".dropdown-trigger")) {
      e.preventDefault();
      toggle();
    }
  });

  menu.addEventListener("click", event => {
    const option = event.target.closest(".dropdown-option");
    if (!option) return;
    const val = option.getAttribute("data-value");
    trigger.setAttribute("data-value", val);
    updateTriggerDisplay();
    dropdownElement.classList.remove("is-open");
    dropdownElement.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    if (typeof onChange === "function") onChange(val);
  });

  updateTriggerDisplay();
}

document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".custom-dropdown")) {
    document.querySelectorAll(".custom-dropdown.is-open").forEach(d => {
      d.classList.remove("is-open");
      d.setAttribute("aria-expanded", "false");
      const m = d.querySelector(".dropdown-menu");
      if (m) m.hidden = true;
    });
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".custom-dropdown.is-open").forEach(d => {
      d.classList.remove("is-open");
      d.setAttribute("aria-expanded", "false");
      const m = d.querySelector(".dropdown-menu");
      if (m) m.hidden = true;
    });
  }
});

function readCustomSubjects() {
  try {
    const value = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!value) return [];
    const subjects = JSON.parse(value);
    if (!Array.isArray(subjects)) throw new TypeError("Saved subjects must be a list.");
    return subjects;
  } catch (error) {
    statusElement.textContent = error.message;
    return [];
  }
}

function saveCustomSubjects(subjects) {
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(subjects));
    return true;
  } catch (error) {
    statusElement.textContent = error.message;
    return false;
  }
}

function catalogueForLevel(level = getLevelValue()) {
  return [...SUBJECT_CATALOGUE, ...readCustomSubjects()]
    .filter(subject => normalizeLevel(subject.level) === normalizeLevel(level));
}

function createSubject(record) {
  const pickTH = positiveOrNull(record.theoryCreditHours);
  const pickPR = positiveOrNull(record.practicalCreditHours);
  return {
    key: `${record.id}-${++subjectSequence}`,
    id: record.id,
    level: normalizeLevel(record.level),
    name: displayName(record.name),
    aliases: record.aliases ?? [],
    theoryMaximum: positiveOrNull(record.theoryMaximum),
    practicalMaximum: positiveOrNull(record.practicalMaximum),
    theoryCreditHours: pickTH,
    practicalCreditHours: pickPR,
    creditHours: pickTH !== null || pickPR !== null ? (pickTH || 0) + (pickPR || 0) : null,
    theoryObtained: "",
    practicalObtained: "",
    theoryGrade: "",
    practicalGrade: "",
    letterGrade: "",
    // Set when the student explicitly picks this subject out of an
    // exclusive group (Mathematics / Social Studies & Life Skill).
    exclusiveChoice: false,
    custom: record.verification === "custom"
  };
}


function positiveOrNull(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) || number <= 0 ? null : number;
}

function initialSubjects() {
  const level = getLevelValue();
  if (!level) return [];
  const presets = getPresets();
  let preset;
  
  if (level === "SEE") {
    preset = presets.see;
  } else if (level === "12") {
    preset = presets["12"]?.[getStreamValue()];
  }
  
  if (!preset || !preset.compulsory) return [];
  
  const records = [];
  for (const name of preset.compulsory) {
    const subject = catalogueForLevel(level).find(s => s.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (subject) records.push(createSubject(subject));
  }
  return records;
}

function updateElectivePicker() {
  const electiveSection = document.getElementById("elective-picker-section");
  const electiveOptions = document.getElementById("elective-options");
  if (!electiveSection || !electiveOptions) return;

  const level = getLevelValue();
  const stream = getStreamValue();
  const presets = getPresets();
  let preset;
  
  if (level === "SEE") preset = presets.see;
  else if (level === "12") preset = presets["12"]?.[stream];
  
  if (!preset || !preset.elective || preset.elective.length === 0) {
    electiveSection.hidden = true;
    return;
  }
  
  const maxElectives = preset.maxElectives || 1;
  const labelText = t(preset.electiveLabel) || t("chooseElectives");
  electiveOptions.innerHTML = "";
  
  const header = document.createElement("div");
  header.className = "elective-picker-header";
  header.innerHTML = `
    <div class="elective-picker-title">${t("chooseElectives")}</div>
    <div class="elective-picker-description">${safe(labelText)}</div>
  `;
  electiveOptions.appendChild(header);
  
  for (const name of preset.elective) {
    const subject = catalogueForLevel(level).find(s => s.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!subject) continue;
    
    const isSelected = selectedSubjects.some(s => s.id === subject.id);
    const label = document.createElement("label");
    label.className = "elective-checkbox-label";
    label.innerHTML = `
      <input type="checkbox" ${isSelected ? "checked" : ""} data-subject-id="${subject.id}" data-subject-name="${safe(name)}" />
      <span class="elective-name">${safe(name)}</span>
      <span class="elective-badge">${t("electiveOptional")}</span>
    `;
    electiveOptions.appendChild(label);
  }
  
  electiveOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const subjectId = checkbox.dataset.subjectId;
      const subject = catalogueForLevel(level).find(s => s.id === subjectId);
      if (!subject) return;
      
      if (checkbox.checked) {
        const currentElectiveCount = selectedSubjects.filter(s => preset.elective.some(e => e.toLocaleLowerCase() === s.name.toLocaleLowerCase())).length;
        if (currentElectiveCount >= maxElectives) {
          checkbox.checked = false;
          return;
        }
        if (!selectedSubjects.some(s => s.id === subjectId)) selectedSubjects.push(createSubject(subject));
      } else {
        selectedSubjects = selectedSubjects.filter(s => s.id !== subjectId);
      }
      renderSubjects();
    });
  });
  
  electiveSection.hidden = false;
}

/**
 * Groups of subjects a student may take *instead of* each other.
 *
 * A student picks one of each group, never both. Mathematics and
 * Social Studies & Life Skill Education are the pair this calculator
 * supports: the subject combination is fixed, so taking both would
 * double-count a slot the combination only allows once.
 */
const MUTUALLY_EXCLUSIVE_GROUPS = Object.freeze([
  Object.freeze(["mathematics", "social studies"])
]);
const MINIMUM_GPA_SUBJECTS = 2;

/**
 * Reduces a subject name to the key used by the exclusive groups.
 */
function normalizeExclusiveName(name) {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("mathematics") || normalized === "math") return "mathematics";
  if (normalized.includes("social studies")) return "social studies";
  return normalized.trim();
}

/**
 * True when a subject carries any entry that could influence a result.
 */
function subjectHasEntries(subject) {
  if (!subject) return false;
  const hasValue = value => value !== null && value !== undefined && String(value).trim() !== "";
  return [subject.theoryObtained, subject.practicalObtained, subject.letterGrade, subject.theoryGrade, subject.practicalGrade]
    .some(hasValue)
    || (Array.isArray(subject.components) && subject.components.some(component =>
      hasValue(component.obtained) || hasValue(component.letter) || hasValue(component.letterGrade)
      || hasValue(component.grade?.letter)));
}

/**
 * Decides which member of an exclusive group counts towards the result.
 *
 * The subject the student filled in is the one that counts; every other
 * member of the group stays in the list but is disabled and contributes
 * nothing. An explicit choice (the "use this instead" control) always wins.
 * When both have data without an explicit choice, the first-listed subject
 * wins. With neither an explicit choice nor entries, both remain selectable.
 *
 * Returns the winning subject, or null when no group applies.
 */
function resolveExclusiveWinner(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) return null;
  for (const group of MUTUALLY_EXCLUSIVE_GROUPS) {
    const members = subjects.filter(subject => group.includes(normalizeExclusiveName(subject.name)));
    if (members.length < 2) continue;

    // An explicit choice always wins.
    const chosen = members.filter(subject => subject.exclusiveChoice);
    if (chosen.length === 1) return chosen[0];

    // Exactly one subject has data — that is the one the student chose.
    const filled = members.filter(subject => subjectHasEntries(subject));
    if (filled.length === 1) return filled[0];

    // If both have data, keep the result deterministic. With no data, leave
    // both available until the student makes a selection.
    if (filled.length > 1) return members[0];
  }
  return null;
}


function isMutuallyExclusiveExcluded(subject) {
  if (!MUTUALLY_EXCLUSIVE_GROUPS.length) return false;
  if (getLevelValue() === "SEE") return false;
  const stream = getStreamValue();
  if (stream !== "science" && stream !== "management") return false;
  const level = getLevelValue();
  if (level !== "12") return false;
  const winner = resolveExclusiveWinner(selectedSubjects);
  if (!winner || winner === subject) return false;
  // Only the subjects of the winning group are excluded; everything else
  // in the list stays active.
  const winnerGroup = MUTUALLY_EXCLUSIVE_GROUPS.find(group => group.includes(normalizeExclusiveName(winner.name)));
  if (!winnerGroup) return false;
  return winnerGroup.includes(normalizeExclusiveName(subject.name));
}

/**
 * Clears every entry on a subject so it cannot contribute to the result.
 * Used when a subject is disabled by the mutual-exclusivity rule.
 */
function clearSubjectEntries(subject) {
  subject.theoryObtained = "";
  subject.practicalObtained = "";
  subject.theoryGrade = "";
  subject.practicalGrade = "";
  subject.letterGrade = "";
}

function applyMutualExclusivityUI() {
  if (getLevelValue() === "SEE") {
    document.querySelectorAll(".subject-card.is-excluded").forEach(card => card.classList.remove("is-excluded"));
    document.querySelectorAll(".subject-card input, .subject-card button.dropdown-trigger").forEach(el => { el.disabled = false; });
    return;
  }
  let changed = false;
  selectedSubjects.forEach(subject => {
    const card = document.querySelector(`.subject-card[data-key="${CSS.escape(subject.key)}"]`);
    if (!card) return;
    const excluded = isMutuallyExclusiveExcluded(subject);
    // A disabled subject must not keep values that would silently affect the
    // calculation, so drop its entries when it becomes disabled.
    if (excluded && subjectHasEntries(subject)) {
      clearSubjectEntries(subject);
      changed = true;
    }
    card.classList.toggle("is-excluded", excluded);
    card.querySelectorAll("input, button.dropdown-trigger").forEach(el => { el.disabled = excluded; });
    // The disabled card keeps a "use this instead" control so the student
    // can switch to it; the card itself is not pointer-interactive.
    const switchBtn = card.querySelector(".subject-card__switch");
    if (switchBtn) {
      switchBtn.hidden = !excluded;
      switchBtn.disabled = false;
    }
  });
  if (changed) {
    // Re-sync the cleared fields in the DOM so the inputs do not keep
    // showing the values that were just discarded.
    renderSubjects();
  }
}


function activeSubjectsForCalculation() {
  return selectedSubjects.filter(subject => !isMutuallyExclusiveExcluded(subject) && subjectGrade(subject) !== null);
}

function hasSubjectEntries() {
  return selectedSubjects.some(subject => subject.letterGrade || subject.theoryGrade || subject.practicalGrade || subject.theoryObtained || subject.practicalObtained);
}

function componentField(subject, kind, label) {
  const maximum = kind === "theory" ? subject.theoryMaximum : subject.practicalMaximum;
  const obtained = kind === "theory" ? subject.theoryObtained : subject.practicalObtained;
  const maxLabel = maximum === null ? t("unknown") : `${t("sourceLabel")} ${maximum}`;
  const disabled = mode === "marks" && maximum === null;
  const clampAttr = maximum !== null && maximum > 0 ? ` oninput="if(this.value > ${maximum}) this.value = ${maximum}; if(this.value < 0) this.value = 0;"` : "";
  return `<label class="component-field${disabled ? " is-unavailable" : ""}"${mode !== "marks" ? " hidden" : ""}>
    <span class="component-label">${label}<small>${safe(maxLabel)}</small></span>
    <input class="mark-input" data-kind="${kind}" type="number" min="0" ${maximum === null ? "" : `max="${maximum}"`}
      step="any" value="${safe(obtained)}" placeholder="${safe(t("marksObtained"))}"
      aria-label="${safe(`${label}, ${t("marksObtained")}, ${maxLabel}`)}"
      ${mode !== "marks" || disabled ? "hidden" : ""} ${disabled ? "disabled" : ""}${clampAttr} />
  </label>`;
}

/**
 * Maps a grade point back to its letter grade.
 *
 * Derived from the `grades` table so it can never drift out of sync with
 * the letters offered in the dropdown. The table is ordered highest grade
 * point first, so the first entry at or above the given point wins.
 */
function gradeLetterFromPoint(gp) {
  const match = grades.find(grade => gp >= grade.gradePoint - 1e-9);
  return match ? match.letter : "E";
}

/**
 * Maps an overall GPA to its indicative letter grade.
 *
 * Uses the same band table as the subject grade points so the overall
 * letter always agrees with the letters shown on the subject cards.
 */
function overallGradeLetter(gpa) {
  if (!Number.isFinite(gpa)) return "—";
  return gradeLetterFromPoint(gpa);
}

/**
 * Maps a percentage to its grade point.
 *
 * Mirrors GRADE_BANDS in calculator.js (A+ at 90, A at 80, B+ at 70 …) but
 * is derived from the `grades` table so the two can never drift apart.
 */
function gradePointFromPercent(pct) {
  if (!Number.isFinite(pct)) return 0.8;
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.6;
  if (pct >= 70) return 3.2;
  if (pct >= 60) return 2.8;
  if (pct >= 50) return 2.4;
  if (pct >= 40) return 2.0;
  if (pct >= 30) return 1.8;
  if (pct >= 20) return 1.6;
  return 0.8;
}


function subjectGrade(subject) {
  if (mode === "grades") {
    const gradeComponents = [
      { kind: "theory", maximum: subject.theoryMaximum, letter: subject.theoryGrade },
      { kind: "practical", maximum: subject.practicalMaximum, letter: subject.practicalGrade }
    ].filter(component => component.maximum !== null);
    if (!gradeComponents.length) {
      if (!subject.letterGrade) return null;
      return subject.letterGrade === "NG" ? { letter: "NG", gradePoint: 0 } : grades.find(grade => grade.letter === subject.letterGrade) ?? null;
    }
    if (gradeComponents.some(component => component.letter === "NG")) return { letter: "NG", gradePoint: 0 };
    const selectedGrades = gradeComponents.map(component => ({ ...component, grade: grades.find(grade => grade.letter === component.letter) }));
    if (selectedGrades.some(component => !component.grade)) return null;
    const gradePoint = calculateComponentGradePoint(selectedGrades.map(component => ({ gradePoint: component.grade.gradePoint, fullMarks: component.maximum })));
    return { letter: gradeLetterFromPoint(gradePoint), gradePoint };
  }
  const components = [
    { kind: "theory", maximum: subject.theoryMaximum, obtained: subject.theoryObtained },
    { kind: "practical", maximum: subject.practicalMaximum, obtained: subject.practicalObtained }
  ].filter(component => component.maximum !== null);
  if (!components.length || components.some(component => component.obtained === "")) return null;
  if (components.some(component => { const mark = Number(component.obtained); return !Number.isFinite(mark) || mark < 0 || mark > component.maximum; })) return null;
  const result = calculateSubject(components.map(component => ({ kind: component.kind, obtained: Number(component.obtained), fullMarks: component.maximum })));
  if (result.notGraded || !result.grade) return result.notGraded ? { letter: "NG", gradePoint: 0 } : null;
  return { letter: gradeLetterFromPoint(result.grade.gradePoint), gradePoint: result.grade.gradePoint };
}

function renderSubject(subject) {
  const grade = subjectGrade(subject);
  let badgeText = "—";
  let badgeClass = "";
  if (grade) {
    if (grade.letter === "NG") { badgeText = "NG"; badgeClass = " is-ng"; }
    else { badgeText = grade.gradePoint.toFixed(2); badgeClass = " is-ready"; }
  }
  const gradeFields = subject.theoryMaximum !== null || subject.practicalMaximum !== null
    ? [
      subject.theoryMaximum !== null && gradeField(subject, "theory", t("theoryGrade")),
      subject.practicalMaximum !== null && gradeField(subject, "practical", t("practicalGrade"))
    ].filter(Boolean).join("")
    : gradeField(subject, "overall", t("subjectGrade"));
  return `<article class="subject-card" data-key="${safe(subject.key)}">
    <div class="subject-heading">
      <h2>${safe(subject.name)}</h2>
      <span class="subject-grade${badgeClass}" aria-label="Subject grade">${safe(badgeText)}</span>
    </div>
    <div class="subject-fields">
      ${componentField(subject, "theory", t("theory"))}
      ${componentField(subject, "practical", t("practical"))}
      <div class="grade-field-set"${mode === "marks" ? " hidden" : ""}>${gradeFields}</div>
    </div>
    <button type="button" class="subject-card__switch" data-switch-key="${safe(subject.key)}" hidden>${safe(t("useThisInstead"))}</button>
  </article>`;
}

/**
 * Finds the other subject of an exclusive group, if the student has both.
 */
function exclusiveSibling(subject) {
  for (const group of MUTUALLY_EXCLUSIVE_GROUPS) {
    const canon = normalizeExclusiveName(subject.name);
    if (!group.includes(canon)) continue;
    return selectedSubjects.find(s => s !== subject && group.includes(normalizeExclusiveName(s.name))) || null;
  }
  return null;
}

/**
 * Switches the selection from one member of an exclusive group to the other.
 * The previously selected subject is cleared and disabled, the new one is
 * enabled and ready for input.
 */
function switchExclusiveSubject(subject) {
  const sibling = exclusiveSibling(subject);
  if (!sibling) return;
  // Record the explicit choice so it survives until the student types.
  selectedSubjects.forEach(item => { item.exclusiveChoice = false; });
  subject.exclusiveChoice = true;
  clearSubjectEntries(sibling);
  clearSubjectEntries(subject);
  renderSubjects();
  // Focus the first input of the newly selected subject so the student can
  // type straight away.
  const card = document.querySelector(`.subject-card[data-key="${CSS.escape(subject.key)}"]`);
  const input = card?.querySelector(".mark-input:not([disabled]), button.dropdown-trigger:not([disabled])");
  if (input) { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}


function gradeField(subject, kind, label) {
  const value = kind === "theory" ? subject.theoryGrade : kind === "practical" ? subject.practicalGrade : subject.letterGrade;
  const labelId = `grade-label-${subject.key}-${kind}`;
  const optionsList = [
    { value: "", label: t("chooseGrade") },
    ...grades.map(item => ({ value: item.letter, label: `${item.gradePoint.toFixed(1)} or ${item.letter}` })),
    { value: "NG", label: "NG" }
  ];
  const selectedOpt = optionsList.find(opt => opt.value === value) || optionsList[0];
  return `<div class="grade-field">
    <span id="${safe(labelId)}">${safe(label)}</span>
    <div class="custom-dropdown grade-dropdown" data-kind="${safe(kind)}" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-label="${safe(`${label}: ${subject.name}`)}">
      <button type="button" class="dropdown-trigger" data-value="${safe(value)}" aria-label="${safe(`${label}: ${subject.name}`)}">
        <span class="dropdown-text">${safe(selectedOpt.label)}</span>
        <span class="dropdown-arrow" aria-hidden="true">▼</span>
      </button>
      <div class="dropdown-menu" role="listbox" hidden>
        ${optionsList.map(opt => `<div class="dropdown-option" role="option" data-value="${safe(opt.value)}" ${opt.value === value ? 'aria-selected="true"' : ''}>${safe(opt.label)}</div>`).join("")}
      </div>
    </div>
  </div>`;
}

function renderSubjects() {
  subjectList.innerHTML = selectedSubjects.length
    ? selectedSubjects.map(renderSubject).join("")
    : `<p class="empty-state">${t(getLevelValue() ? "none" : "chooseLevelStatus")}</p>`;
  
  subjectList.querySelectorAll(".custom-dropdown").forEach(dropdown => {
    initCustomDropdown(dropdown, (val) => {
      const card = dropdown.closest(".subject-card");
      const subject = selectedSubjects.find(item => item.key === card?.dataset.key);
      if (subject) {
        const kind = dropdown.dataset.kind;
        if (kind === "theory") subject.theoryGrade = val;
        else if (kind === "practical") subject.practicalGrade = val;
        else subject.letterGrade = val;
        // Choosing a grade in one member of an exclusive pair selects it.
        if (subjectHasEntries(subject)) {
          selectedSubjects.forEach(item => { item.exclusiveChoice = item === subject; });
        }
      }
      updateResult();
      applyMutualExclusivityUI();
    });
  });

  updateResult();
  applyMutualExclusivityUI();
}

function syncSubject(subject, card) {
  for (const input of card.querySelectorAll(".mark-input")) {
    const kind = input.dataset.kind;
    let raw = input.value.trim();
    const mark = raw === "" ? null : Number(raw);
    const maximum = kind === "theory" ? subject.theoryMaximum : subject.practicalMaximum;
    
    if (maximum !== null && Number.isFinite(mark)) {
      if (mark > maximum) { input.value = maximum; raw = String(maximum); }
      else if (mark < 0) { input.value = 0; raw = "0"; }
    }

    const invalid = raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || (maximum !== null && Number(raw) > maximum));
    input.classList.toggle("is-invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
    if (kind === "theory") subject.theoryObtained = raw;
    else subject.practicalObtained = raw;
  }
}

function evaluate() {
  if (!getLevelValue()) return { gpa: null, grade: null, state: "chooseLevel" };
  if (!selectedSubjects.length) return { gpa: null, grade: null, state: "incomplete" };

  const evaluableSubjects = selectedSubjects.filter(subject => !isMutuallyExclusiveExcluded(subject));
  let hasUnknownMaxima = false;
  if (mode === "marks") hasUnknownMaxima = evaluableSubjects.some(subject => subject.theoryMaximum === null && subject.practicalMaximum === null);
  if (hasUnknownMaxima) return { gpa: null, grade: null, state: "unknown" };

  const level = getLevelValue();
  if (level === "SEE") {
    const validSubjects = evaluableSubjects.map(subject => {
      const grade = subjectGrade(subject);
      if (!grade) return null;
      const weight = (subject.theoryMaximum || 0) + (subject.practicalMaximum || 0) || 100;
      return { gradePoint: grade.gradePoint, weight };
    }).filter(Boolean);
    if (validSubjects.length < MINIMUM_GPA_SUBJECTS) return { gpa: null, grade: null, state: "incomplete" };
    const gpa = calculateMeanGPA(validSubjects);
    if (gpa === null) return { gpa: null, grade: null, state: "incomplete" };
    const grade = overallGradeLetter(gpa);
    return { gpa, grade, state: "ready", count: validSubjects.length };

  }

  const componentEntries = [];
  const completedSubjectCount = evaluableSubjects.filter(subject => subjectGrade(subject) !== null).length;
  const addComponentEntry = (subject, entry) => componentEntries.push({ ...entry, subjectKey: subject.key });
  for (const subject of evaluableSubjects) {
    const thMax = subject.theoryMaximum;
    const prMax = subject.practicalMaximum;
    const thCH = subject.theoryCreditHours;
    const prCH = subject.practicalCreditHours;
    const thHas = thMax !== null;
    const prHas = prMax !== null;
    const thObtained = subject.theoryObtained;
    const prObtained = subject.practicalObtained;
    const thLetter = subject.theoryGrade;
    const prLetter = subject.practicalGrade;

    if (mode === "marks") {
      const grade = subjectGrade(subject);
      if (!grade) continue;
      if (grade.letter === "NG") {
        if (thHas && thCH !== null && thCH > 0) addComponentEntry(subject, { gradePoint: 0, creditHours: thCH });
        if (prHas && prCH !== null && prCH > 0) addComponentEntry(subject, { gradePoint: 0, creditHours: prCH });
        continue;
      }
      if (thHas && thObtained !== "" && thCH !== null && thCH > 0) {
        const pct = Math.max(0, Math.min(100, (Number(thObtained) / thMax) * 100));
        addComponentEntry(subject, { gradePoint: gradePointFromPercent(pct), creditHours: thCH });
      }
      if (prHas && prObtained !== "" && prCH !== null && prCH > 0) {
        const pct = Math.max(0, Math.min(100, (Number(prObtained) / prMax) * 100));
        addComponentEntry(subject, { gradePoint: gradePointFromPercent(pct), creditHours: prCH });
      }

    } else {
      const thDone = thHas && thLetter !== "";
      const prDone = prHas && prLetter !== "";
      if (thHas || prHas) {
        if (thHas && thLetter) {
          if (thLetter === "NG" && thCH !== null && thCH > 0) addComponentEntry(subject, { gradePoint: 0, creditHours: thCH });
          else {
            const gp = grades.find(g => g.letter === thLetter)?.gradePoint;
            if (gp !== undefined && thCH !== null && thCH > 0) addComponentEntry(subject, { gradePoint: gp, creditHours: thCH });
          }
        }
        if (prHas && prLetter) {
          if (prLetter === "NG" && prCH !== null && prCH > 0) addComponentEntry(subject, { gradePoint: 0, creditHours: prCH });
          else {
            const gp = grades.find(g => g.letter === prLetter)?.gradePoint;
            if (gp !== undefined && prCH !== null && prCH > 0) addComponentEntry(subject, { gradePoint: gp, creditHours: prCH });
          }
        }
        if ((thHas && !thDone) && (prHas && !prDone)) continue;
        if (thDone || prDone) continue;
      }
      if (!thHas && !prHas) {
        const grade = subjectGrade(subject);
        if (!grade) continue;
        const gp = grade.letter === "NG" ? 0 : grades.find(g => g.letter === grade.letter)?.gradePoint;
        if (gp !== undefined) {
          const ch = subject.creditHours || 4.0;
          addComponentEntry(subject, { gradePoint: gp, creditHours: ch });
        }
      }
    }
  }

  if (componentEntries.length === 0) {
    const fallback = evaluableSubjects.map(subject => {
      const grade = subjectGrade(subject);
      if (!grade) return null;
      const weight = (subject.theoryMaximum || 0) + (subject.practicalMaximum || 0) || 100;
      return { gradePoint: grade.gradePoint, weight };
    }).filter(Boolean);
    if (fallback.length < MINIMUM_GPA_SUBJECTS) return { gpa: null, grade: null, state: "incomplete" };
    const gpa = calculateMeanGPA(fallback);
    if (gpa === null) return { gpa: null, grade: null, state: "incomplete" };
    const grade = overallGradeLetter(gpa);
    return { gpa, grade, state: "ready", count: fallback.length };

  }

  if (completedSubjectCount < MINIMUM_GPA_SUBJECTS) return { gpa: null, grade: null, state: "incomplete" };
  const totalCH = componentEntries.reduce((s,c)=>s+c.creditHours,0);
  const weighted = componentEntries.reduce((s,c)=>s+c.gradePoint*c.creditHours,0);
  const gpa = totalCH ? Math.round((weighted/totalCH + Number.EPSILON)*100)/100 : null;
  if (gpa === null) return { gpa: null, grade: null, state: "incomplete" };
  const grade = overallGradeLetter(gpa);
  return { gpa, grade, state: "ready", count: completedSubjectCount };
}


function updateResult() {
  const result = evaluate();
  gpaElement.textContent = result.gpa === null ? "—" : result.gpa.toFixed(2);
  gradeElement.textContent = result.grade ?? "—";
  downloadButton.style.display = result.state === "ready" ? "block" : "none";
  
  let statusText = t("chooseLevelStatus");
  if (result.state === "ready") statusText = t("readyPartial").replace("{count}", result.count);
  else statusText = t({ incomplete: "incomplete", unknown: "unknown" }[result.state] ?? "chooseLevelStatus");
  statusElement.textContent = statusText;

  subjectList.querySelectorAll(".subject-card").forEach(card => {
    const subject = selectedSubjects.find(item => item.key === card.dataset.key);
    const grade = subject ? subjectGrade(subject) : null;
    const badge = card.querySelector(".subject-grade");
    let badgeText = "—";
    if (grade) badgeText = grade.letter === "NG" ? "NG" : grade.gradePoint.toFixed(2);
    badge.textContent = badgeText;
    badge.classList.toggle("is-ready", Boolean(grade && grade.letter !== "NG"));
    badge.classList.toggle("is-ng", grade?.letter === "NG");
  });

  const summaryContainer = document.getElementById("subject-summary-breakdown");
  if (summaryContainer) {
    summaryContainer.innerHTML = "";
    if (result.state === "ready" || result.state === "incomplete") {
      // Only the subjects that actually count towards the result are listed,
      // so a disabled subject never shows up in the summary.
      selectedSubjects.forEach(subject => {
        if (isMutuallyExclusiveExcluded(subject)) return;
        const grade = subjectGrade(subject);
        if (grade) summaryContainer.innerHTML += `<div>${safe(subject.name)} : ${safe(grade.letter)}</div>`;
      });
    }

  }
}

function renderCatalogue() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const selected = new Set(selectedSubjects.map(subject => subject.id));
  const results = catalogueForLevel().filter(subject =>
    [subject.name, ...(subject.aliases ?? [])].join(" ").toLocaleLowerCase().includes(query));
  catalogueResults.innerHTML = results.map(subject => {
    const exists = selected.has(subject.id);
    return `<div class="catalogue-item">
      <span>${safe(displayName(subject.name))}</span>
      <button type="button" class="catalogue-action" data-id="${safe(subject.id)}" data-selected="${exists}">
        ${exists ? t("remove") : t("add")}
      </button>
    </div>`;
  }).join("") || `<p class="empty-state">${t("none")}</p>`;
}

function translatePage() {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll(".custom-dropdown").forEach(dropdown => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const textSpan = trigger.querySelector(".dropdown-text");
    const val = trigger.getAttribute("data-value");
    const opt = dropdown.querySelector(`.dropdown-option[data-value="${val}"]`);
    if (opt) {
      if (opt.hasAttribute("data-i18n")) textSpan.textContent = t(opt.getAttribute("data-i18n"));
      else textSpan.textContent = opt.textContent;
    }
  });
  document.getElementById("language-toggle").textContent = language === "en" ? "नेपाली" : "English";
  renderSubjects();
  updateElectivePicker();
  if (dialog.open) renderCatalogue();
}

document.getElementById("language-toggle").addEventListener("click", () => {
  language = language === "en" ? "ne" : "en";
  translatePage();
});

initCustomDropdown(levelSelect, (val) => {
  const prevVal = levelTrigger.dataset.previousValue ?? "";
  if (hasSubjectEntries()
    && !window.confirm(language === "en" ? "Changing class clears the current subject entries. Continue?" : "कक्षा परिवर्तन गर्दा हालका विवरण हट्छन्। जारी राख्ने?")) {
    levelTrigger.setAttribute("data-value", prevVal);
    levelSelect.querySelector(".dropdown-text").textContent = levelSelect.querySelector(`.dropdown-option[data-value="${prevVal}"]`)?.textContent || "";
    streamField.hidden = prevVal === "SEE";
    streamTrigger.setAttribute("data-value", prevVal === "SEE" ? "science" : lastAcademicStream);
    streamSelect.querySelector(".dropdown-text").textContent = streamSelect.querySelector(`.dropdown-option[data-value="${streamTrigger.getAttribute("data-value")}"]`)?.textContent || "";
    return;
  }
  levelTrigger.dataset.previousValue = val;
  streamField.hidden = val === "SEE";
  const newStream = val === "SEE" ? "science" : lastAcademicStream;
  streamTrigger.setAttribute("data-value", newStream);
  streamSelect.querySelector(".dropdown-text").textContent = streamSelect.querySelector(`.dropdown-option[data-value="${newStream}"]`)?.textContent || "";
  selectedSubjects = initialSubjects();
  renderSubjects();
  updateElectivePicker();
});

initCustomDropdown(streamSelect, (val) => {
  const currentLevel = getLevelValue();
  if (currentLevel === "12") {
    if (hasSubjectEntries()
      && !window.confirm(language === "en" ? "Changing stream replaces your selected subjects. Continue?" : "सङ्काय परिवर्तन गर्दा विषयहरू बदलिन्छन्। जारी राख्ने?")) {
      streamTrigger.setAttribute("data-value", lastAcademicStream);
      streamSelect.querySelector(".dropdown-text").textContent = streamSelect.querySelector(`.dropdown-option[data-value="${lastAcademicStream}"]`)?.textContent || "";
      return;
    }
    lastAcademicStream = val;
    selectedSubjects = initialSubjects();
    renderSubjects();
    updateElectivePicker();
  } else if (!currentLevel) {
    lastAcademicStream = val;
  }
});

function setMode(nextMode) {
  mode = nextMode;
  marksModeButton.classList.toggle("is-active", mode === "marks");
  gradesModeButton.classList.toggle("is-active", mode === "grades");
  marksModeButton.setAttribute("aria-pressed", String(mode === "marks"));
  gradesModeButton.setAttribute("aria-pressed", String(mode === "grades"));
  renderSubjects();
}

marksModeButton.addEventListener("click", () => setMode("marks"));
gradesModeButton.addEventListener("click", () => setMode("grades"));

// "Use this instead" on a disabled subject switches the exclusive pair.
subjectList.addEventListener("click", event => {
  const button = event.target.closest(".subject-card__switch");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const subject = selectedSubjects.find(item => item.key === button.dataset.switchKey);
  if (subject) switchExclusiveSubject(subject);
});


subjectList.addEventListener("input", event => {
  const card = event.target.closest(".subject-card");
  if (!card) return;
  const subject = selectedSubjects.find(item => item.key === card.dataset.key);
  if (subject) {
    syncSubject(subject, card);
    // Entering a value in one member of an exclusive pair selects it.
    if (subjectHasEntries(subject)) {
      selectedSubjects.forEach(item => { item.exclusiveChoice = item === subject; });
    }
  }
  updateResult();
  applyMutualExclusivityUI();
});


subjectList.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  if (!event.target.matches(".mark-input")) return;
  event.preventDefault();
  const inputs = [...document.querySelectorAll(".mark-input")].filter(el => {
    if (el.disabled) return false;
    if (el.hidden) return false;
    if (el.closest(".subject-card.is-excluded")) return false;
    const style = el.offsetParent;
    return style !== null;
  });
  const idx = inputs.indexOf(event.target);
  if (idx === -1) return;
  const next = inputs[idx + 1];
  if (next) {
    next.focus();
    next.select();
  } else {
    const card = document.querySelector(".result-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

subjectList.addEventListener("change", event => {
  if (!event.target.matches(".grade-select")) return;
  const card = event.target.closest(".subject-card");
  const subject = selectedSubjects.find(item => item.key === card.dataset.key);
  if (subject) {
    if (event.target.dataset.kind === "theory") subject.theoryGrade = event.target.value;
    else if (event.target.dataset.kind === "practical") subject.practicalGrade = event.target.value;
    else subject.letterGrade = event.target.value;
  }
  updateResult();
});

document.getElementById("add-subject").addEventListener("click", () => {
  if (!getLevelValue()) {
    statusElement.textContent = t("chooseLevelStatus");
    levelTrigger.focus();
    return;
  }
  customForm.hidden = true;
  searchInput.value = "";
  renderCatalogue();
  dialog.showModal();
  searchInput.focus();
});

searchInput.addEventListener("input", renderCatalogue);

catalogueResults.addEventListener("click", event => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const subject = catalogueForLevel().find(item => item.id === button.dataset.id);
  if (!subject) return;
  if (button.dataset.selected === "true") selectedSubjects = selectedSubjects.filter(item => item.id !== subject.id);
  else if (!selectedSubjects.some(item => item.id === subject.id)) selectedSubjects.push(createSubject(subject));
  renderSubjects();
  renderCatalogue();
});

document.getElementById("show-custom-form").addEventListener("click", () => {
  customForm.hidden = !customForm.hidden;
  if (!customForm.hidden) customForm.elements.namedItem("customName").focus();
});

customForm.addEventListener("submit", event => {
  event.preventDefault();
  customError.hidden = true;
  const name = String(new FormData(customForm).get("customName") ?? "").trim();
  const theoryMaximum = positiveOrNull(customForm.elements.namedItem("customTheoryMax").value);
  const practicalMaximum = positiveOrNull(customForm.elements.namedItem("customPracticalMax").value);
  if (!name || (!theoryMaximum && !practicalMaximum)) {
    customError.textContent = t("customError");
    customError.hidden = false;
    return;
  }
  const record = {
    id: `custom-${getLevelValue()}-${crypto.randomUUID?.() ?? Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    aliases: [],
    level: normalizeLevel(getLevelValue()),
    theoryMaximum,
    practicalMaximum,
    verification: "custom"
  };
  const customSubjects = readCustomSubjects();
  customSubjects.push(record);
  if (!saveCustomSubjects(customSubjects)) return;
  selectedSubjects.push(createSubject(record));
  customForm.reset();
  dialog.close();
  renderSubjects();
});

document.getElementById("reset-calculator").addEventListener("click", () => {
  nameInput.value = "";
  selectedSubjects.forEach(subject => {
    subject.theoryObtained = "";
    subject.practicalObtained = "";
    subject.theoryGrade = "";
    subject.practicalGrade = "";
    subject.letterGrade = "";
    // Drop the explicit choice so the default selection is restored.
    subject.exclusiveChoice = false;
  });
  renderSubjects();
});


function flushActiveInputsToModel() {
  document.querySelectorAll(".subject-card").forEach(card => {
    const subject = selectedSubjects.find(item => item.key === card.dataset.key);
    if (subject) syncSubject(subject, card);
  });
}

function generatePDFTranscript() {
  flushActiveInputsToModel();
  const level = getLevelValue();
  if (level !== "12") {
    const text = generateResultText();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neb-gpa-result.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const result = evaluate();
  if (!result || result.state !== "ready") return;

  const name = (nameInput.value || "").trim();
  const classLabel = "+2 (NEB)";
  const streamLabel = getStreamValue();

  const transcriptSubjects = selectedSubjects.filter(s => !isMutuallyExclusiveExcluded(s) && subjectGrade(s) !== null);
  if (transcriptSubjects.length === 0) {
    const fallbackText = generateResultText();
    if (!fallbackText) { flushActiveInputsToModel(); renderSubjects(); }
    return;
  }
  let subjectRows = "";
  transcriptSubjects.forEach((subject, idx) => {
    const grade = subjectGrade(subject);
    const subjectCode = (subject.subjectCode && subject.subjectCode !== subject.id) ? subject.subjectCode : "";
    const cleanSubjectCode = subjectCode ? subjectCode.replace(/^0+/, "") : `SUB${String(idx + 1).padStart(2, "0")}`;
    const ch = subject.theoryCreditHours !== null || subject.practicalCreditHours !== null
      ? ((subject.theoryCreditHours || 0) + (subject.practicalCreditHours || 0)).toFixed(1)
      : (subject.creditHours ? subject.creditHours.toFixed(1) : (((subject.theoryMaximum || 0) + (subject.practicalMaximum || 0) === 100) ? "4.0" : "3.0"));
    const gradePoint = grade ? (grade.letter === "NG" ? "0.00" : grade.gradePoint.toFixed(2)) : "—";
    const gradeLetter = grade?.letter ?? "—";
    const finalGrade = grade?.letter ?? "—";
    const remarks = grade?.letter === "NG" ? "NG" : "";

    subjectRows += `
      <tr${idx % 2 === 1 ? ' class="striped"' : ""}>
        <td>${idx + 1}</td>
        <td class="code">${safe(cleanSubjectCode)}</td>
        <td class="subj">${safe(subject.name)}</td>
        <td>${safe(ch)}</td>
        <td class="gp">${gradePoint}</td>
        <td><span class="grade-badge">${safe(gradeLetter)}</span></td>
        <td><span class="grade-badge final">${safe(finalGrade)}</span></td>
        <td>${safe(remarks)}</td>
      </tr>
    `;
  });

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const addressName = name || "Student";
  const showCongrats = result.gpa >= 2.8 || ["A+", "A", "B+", "B"].includes(result.grade);
  const congratsHtml = showCongrats ? `<div class="congrats"><span class="confetti">🎉</span> Congratulations, ${safe(addressName)}! Excellent performance! <span class="confetti">✨</span></div>` : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Marksheet Summary — GPA ${result.gpa.toFixed(2)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @page { size: A4; margin: 1.2cm; }
        * { box-sizing: border-box; }
        body {
          font-family: Inter, 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
          font-size: 12px; line-height: 1.45; color: #0f0f0f;
          margin: 0; padding: 18px; background: #fff; position: relative;
        }
        .watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-40deg);
          font-size: 3.6rem; color: rgba(0,0,0,.07); pointer-events: none;
          z-index: 10; font-weight: 800; text-align: center; white-space: nowrap;
          width: 100%; letter-spacing: .04em;
        }
        .disclaimer {
          background: linear-gradient(135deg, #fff7ed, #fee2e2);
          border: 1px solid #fecaca; color: #7f1d1d;
          padding: 10px 14px; margin-bottom: 18px; text-align: center;
          font-weight: 700; font-size: 11.5px; border-radius: 8px; letter-spacing: .02em;
        }
        .header { text-align: center; margin-bottom: 16px; padding: 14px 10px 10px; border: 1px solid #18181b; border-radius: 12px; background: #0e0e0e; color: #fafaf9; }
        .header .badge { display: inline-block; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px; }
        .header h1 { font-size: 20px; font-weight: 800; margin: 0 0 4px; letter-spacing: .01em; }
        .header .sub { font-size: 11px; color: #d4d4d8; margin-top: 2px; }
        .student-info { display: flex; justify-content: space-between; gap: 12px; margin: 14px 0; padding: 10px 12px; border: 1px solid #e4e4e7; border-radius: 10px; background: #fafafa; }
        .student-info div { flex: 1; font-size: 12px; }
        .student-info label { font-weight: 700; color: #18181b; margin-right: 6px; }
        .congrats {
          margin: 10px 0 14px; padding: 12px 14px; text-align: center;
          font-weight: 800; font-size: 13px; color: #14532d;
          background: linear-gradient(135deg, #dcfce7, #f0fdf4);
          border: 1px solid #86efac; border-radius: 10px;
        }
        .congrats .confetti { font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; border: 1px solid #18181b; border-radius: 10px; overflow: hidden; }
        thead th { background: #18181b; color: #fafaf9; padding: 9px 8px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; font-weight: 700; }
        tbody td { padding: 8px 8px; text-align: center; font-size: 11px; border-bottom: 1px solid #e7e5e4; }
        tbody tr.striped { background: #fafaf9; }
        tbody td.subj { text-align: left; padding-left: 10px; font-weight: 600; }
        tbody td.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; letter-spacing: .02em; }
        tbody td.gp { font-weight: 700; }
        .grade-badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-weight: 800; font-size: 10px; letter-spacing: .04em; background: #ede9fe; color: #4c1d95; border: 1px solid #ddd6fe; }
        .grade-badge.final { background: #18181b; color: #fafaf9; border-color: #18181b; }
        .summary-card { display: flex; gap: 12px; margin-top: 10px; }
        .summary-card .card { flex: 1; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px 16px; text-align: center; background: #fafafa; }
        .summary-card .card.primary { background: #0e0e0e; color: #fafaf9; border-color: #0e0e0e; }
        .summary-card .k { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #a1a1aa; }
        .summary-card .card.primary .k { color: #a1a1aa; }
        .summary-card .v { font-size: 24px; font-weight: 800; margin-top: 4px; }
        .summary-card .card.primary .v { color: #fafaf9; }
        .summary-card .card .badge-lg { display: inline-block; margin-top: 6px; padding: 4px 10px; border-radius: 999px; font-weight: 800; font-size: 11px; background: #ede9fe; color: #4c1d95; border: 1px solid #ddd6fe; }
        .summary-card .card.primary .badge-lg { background: #fafaf9; color: #18181b; border-color: #fafaf9; }
        .footer { margin-top: 16px; color: #71717a; font-size: 10px; display: flex; justify-content: space-between; gap: 12px; }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .watermark { color: rgba(0,0,0,.06) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <div class="watermark">SELF-CALCULATED · UNOFFICIAL</div>
      <div class="disclaimer">Unofficial Estimation / Self-Calculated Result Summary</div>
      <div class="header">
        <div class="badge">Calculated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
        <h1>+2 GPA CALCULATION REPORT</h1>
        <div class="sub">Academic Marksheet Summary — ${safe(classLabel)}</div>
      </div>
      <div class="student-info">
        <div><label>Student</label>${safe(addressName)}</div>
        <div style="text-align:right"><label>Level</label>${safe(classLabel)}</div>
      </div>
      ${congratsHtml}
      <table>
        <thead>
          <tr>
            <th>S.N.</th>
            <th>Code</th>
            <th>Subject</th>
            <th>Credit Hr</th>
            <th>GP</th>
            <th>Grade</th>
            <th>Final</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
        </tbody>
      </table>
      <div class="summary-card">
        <div class="card primary">
          <div class="k">Overall GPA</div>
          <div class="v">${result.gpa.toFixed(2)}</div>
        </div>
        <div class="card">
          <div class="k">Overall Grade</div>
          <div class="v">${safe(result.grade)}</div>
          <div class="badge-lg">${safe(result.grade)}</div>
        </div>
      </div>
      <div class="footer">
        <div>Sources: entered marks/grades only · Not an official NEB document. Verify with school/NEB.</div>
        <div style="text-align:right">Generated locally — no data leaves your device.</div>
      </div>
    </body>
    </html>
  `;

  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlContent);
  iframe.contentDocument.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => { iframe.remove(); }, 1000);
    }, 250);
  };
}

function generateResultText() {
  flushActiveInputsToModel();
  const result = evaluate();
  if (!result || result.state !== "ready") return "";
  const name = (nameInput.value || "").trim();
  const level = getLevelValue() || "";
  const hasActive = selectedSubjects.some(s => !isMutuallyExclusiveExcluded(s) && subjectGrade(s) !== null);
  if (!hasActive) return "";
  const lines = [];
  lines.push("NEB GPA Calculator Result");
  lines.push("");
  if (name) lines.push(`Student: ${name}`);
  lines.push(`Class / Level: ${level}`);
  lines.push(`Overall GPA: ${result.gpa.toFixed(2)}`);
  lines.push(`Overall Grade: ${result.grade}`);
  lines.push("");
  lines.push("Subjects:");
  const exportSubjects = selectedSubjects.filter(s => !isMutuallyExclusiveExcluded(s));
  exportSubjects.forEach(subject => {
    const grade = subjectGrade(subject);
    if (!grade) return;
    const ch = subject.theoryCreditHours !== null || subject.practicalCreditHours !== null
      ? ((subject.theoryCreditHours || 0) + (subject.practicalCreditHours || 0)).toFixed(1)
      : (subject.creditHours ? subject.creditHours.toFixed(1) : (((subject.theoryMaximum || 0) + (subject.practicalMaximum || 0) === 100) ? "4.0" : "3.0"));
    const marksInfo = mode === "marks"
      ? [subject.theoryMaximum !== null ? `Th ${subject.theoryObtained || "—"}/${subject.theoryMaximum}` : null,
         subject.practicalMaximum !== null ? `Pr ${subject.practicalObtained || "—"}/${subject.practicalMaximum}` : null].filter(Boolean).join(", ")
      : `Grade ${grade.letter}`;
    lines.push(`- ${subject.name} (${ch} CH): ${marksInfo} → ${grade.letter} (${grade.gradePoint.toFixed(2)})`);
  });
  lines.push("");
  lines.push("Note: This is an estimate / unverified result.");
  return lines.join("\n");
}

downloadButton.addEventListener("click", generatePDFTranscript);

document.documentElement.lang = language;
levelTrigger.dataset.previousValue = getLevelValue();
streamField.hidden = getLevelValue() === "SEE";
renderSubjects();
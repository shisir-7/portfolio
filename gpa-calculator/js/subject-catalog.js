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

export const NEB_XI_XII_CATALOGUE = Object.freeze(
  historicalRows.trim().split("\n").flatMap(line => ["XI", "XII"].map(level => legacyRecord(line, level)).filter(Boolean))
);

export const SEE_CATALOGUE = Object.freeze(SEE_SUBJECTS.map(subject => Object.freeze({
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

export const SUBJECT_CATALOGUE = Object.freeze([...SEE_CATALOGUE, ...NEB_XI_XII_CATALOGUE]);

export function createSubjectCatalogueAudit() {
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

export const SUBJECT_SOURCE_REGISTRY = Object.freeze([
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

export const CATALOGUE_CAVEATS = Object.freeze({
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

import assert from "node:assert/strict";
import test from "node:test";
import { calculateAggregateTotals, calculateComponentGradePoint, calculateGPA, calculateMeanGPA, calculateSubject, getGrade } from "../js/calculator.js";
import {
  createSubjectCatalogueAudit,
  NEB_XI_XII_CATALOGUE,
  SEE_CATALOGUE,
  SUBJECT_CATALOGUE,
  SUBJECT_SOURCE_REGISTRY
} from "../js/subject-catalog.js";

test("maps every NEB reference grade boundary without inventing a grade below 0%", () => {
  assert.equal(getGrade(100).letter, "A+");
  assert.equal(getGrade(90).letter, "A+");
  assert.equal(getGrade(89.99).letter, "A");
  assert.equal(getGrade(80).letter, "A");
  assert.equal(getGrade(79.99).letter, "B+");
  assert.equal(getGrade(70).letter, "B+");
  assert.equal(getGrade(60).letter, "B");
  assert.equal(getGrade(50).letter, "C+");
  assert.equal(getGrade(40).letter, "C");
  assert.equal(getGrade(35).letter, "D+");
  assert.equal(getGrade(30).letter, "D+");
  assert.equal(getGrade(29.99).letter, "D");
  assert.equal(getGrade(20).letter, "D");
  assert.equal(getGrade(19.99).letter, "E");
  assert.equal(getGrade(0).letter, "E");
  assert.throws(() => getGrade(101), RangeError);
});

test("calculates a credit-weighted GPA and rounds to two decimal places", () => {
  assert.equal(calculateGPA([
    { gradePoint: 4, creditHours: 4 },
    { gradePoint: 2.8, creditHours: 3 },
    { gradePoint: 2, creditHours: 20 }
  ]), 2.39);
});

test("calculates a weighted mean GPA for the simplified calculator", () => {
  assert.equal(calculateMeanGPA([{ gradePoint: 4, weight: 1 }, { gradePoint: 3.6, weight: 1 }, { gradePoint: 2.8, weight: 1 }]), 3.47);
  assert.equal(calculateMeanGPA([{ gradePoint: 4, weight: 1 }, { gradePoint: null, weight: 1 }]), null);
  assert.throws(() => calculateMeanGPA([]), TypeError);
  assert.throws(() => calculateMeanGPA([{ gradePoint: 4.1, weight: 1 }]), RangeError);
});

test("combines component letter grades using each subject's configured component maxima", () => {
  assert.equal(calculateComponentGradePoint([
    { gradePoint: 4, fullMarks: 75 },
    { gradePoint: 2, fullMarks: 25 }
  ]), 3.5);
  assert.equal(calculateComponentGradePoint([
    { gradePoint: 3.6, fullMarks: 75 },
    { gradePoint: 3.6, fullMarks: 25 }
  ]), 3.6);
  assert.equal(calculateComponentGradePoint([
    { gradePoint: 4, fullMarks: 75 },
    { gradePoint: null, fullMarks: 25 }
  ]), null);
  assert.throws(() => calculateComponentGradePoint([]), TypeError);
  assert.throws(() => calculateComponentGradePoint([
    { gradePoint: 4.1, fullMarks: 75 }
  ]), RangeError);
  assert.throws(() => calculateComponentGradePoint([
    { gradePoint: 4, fullMarks: 0 }
  ]), RangeError);
  assert.throws(() => calculateComponentGradePoint([
    { gradePoint: 4, fullMarks: 75 },
    { gradePoint: null, fullMarks: -1 }
  ]), RangeError);
});

test("does not calculate GPA without verified user-entered credits or for NG subjects", () => {
  assert.equal(calculateGPA([
    { gradePoint: 4, creditHours: 4 },
    { gradePoint: 3.6, creditHours: null }
  ]), null);
  assert.equal(calculateGPA([
    { gradePoint: 4, creditHours: 4 },
    { gradePoint: null, creditHours: 3 }
  ]), null);
  assert.equal(calculateGPA([
    { gradePoint: 4, creditHours: 4, notGraded: true }
  ]), null);
});

test("uses configured absolute component pass marks, never a universal assumed percentage", () => {
  const passing = calculateSubject([
    { kind: "theory", obtained: 30, fullMarks: 75, minimumPassMarks: 26.25 },
    { kind: "practical", obtained: 10, fullMarks: 25, minimumPassMarks: null }
  ]);
  assert.equal(passing.notGraded, false);
  assert.equal(passing.components[1].status, "pass-rule-unknown");

  const failing = calculateSubject([
    { kind: "theory", obtained: 26, fullMarks: 75, minimumPassMarks: 26.25 },
    { kind: "practical", obtained: 25, fullMarks: 25, minimumPassMarks: null }
  ]);
  assert.equal(failing.notGraded, true);
  assert.equal(failing.grade, null);
  assert.equal(failing.components[0].failedMinimum, true);
});

test("marks absence as NG and validates supplied component limits", () => {
  const absent = calculateSubject([
    { kind: "theory", obtained: 0, fullMarks: 50, absent: true }
  ]);
  assert.equal(absent.notGraded, true);
  assert.equal(absent.components[0].status, "absent");
  assert.throws(() => calculateSubject([
    { kind: "theory", obtained: 11, fullMarks: 10, minimumPassMarks: 5 }
  ]), RangeError);
  assert.throws(() => calculateSubject([
    { kind: "practical", obtained: 10, fullMarks: 10, minimumPassMarks: 11 }
  ]), RangeError);
});

test("aggregates mixed subject maxima and entered marks without hardcoded totals", () => {
  const totals = calculateAggregateTotals([
    {
      verification: "custom",
      components: [
        { kind: "theory", obtained: "60", fullMarks: "75" },
        { kind: "practical", obtained: "20", fullMarks: "25" }
      ]
    },
    {
      verification: "historical",
      components: [
        { kind: "theory", obtained: "30", fullMarks: "50" },
        { kind: "practical", obtained: "", fullMarks: "50" }
      ]
    },
    {
      verification: "historical",
      components: [{ kind: "theory", obtained: "", fullMarks: "" }]
    }
  ]);
  assert.equal(totals.theoryMaximum, 125);
  assert.equal(totals.theoryObtained, 90);
  assert.equal(totals.practicalMaximum, 75);
  assert.equal(totals.practicalObtained, 20);
  assert.equal(totals.subjects, 3);
  assert.equal(totals.customSubjects, 1);
  assert.equal(totals.historicalOrUnverifiedSubjects, 2);
  assert.equal(totals.incompleteComponents, 1);
  assert.equal(totals.unknownTheoryComponents, 1);
});

test("uses the SEE framework's subject-specific 75/25 component maxima only where verified", () => {
  assert.equal(SEE_CATALOGUE.length, 11);
  let verifiedCount = 0;
  for (const subject of SEE_CATALOGUE) {
    assert.equal(subject.subjectCode, null);
    assert.equal(subject.theoryMaximum !== null && subject.practicalMaximum !== null, true);
    assert.equal(subject.totalMaximum, subject.theoryMaximum + subject.practicalMaximum);
    assert.equal(subject.theoryPassMarks, null);
    assert.equal(subject.creditHours, null);
    if (subject.verification === "verified-current") verifiedCount++;
  }
  assert.equal(verifiedCount, 11);
});

test("includes both verified SEE components in totals and GPA while validating mark inputs", () => {
  const subject = SEE_CATALOGUE.find(entry => entry.name === "English");
  const marks = calculateSubject([
    { kind: "theory", obtained: 60, fullMarks: subject.theoryMaximum },
    { kind: "practical", obtained: 20, fullMarks: subject.practicalMaximum }
  ]);
  assert.equal(marks.obtained, 80);
  assert.equal(marks.fullMarks, 100);
  assert.equal(marks.percentage, 80);
  assert.equal(marks.grade.gradePoint, 3.6);
  assert.equal(calculateMeanGPA([{ gradePoint: marks.grade.gradePoint, weight: marks.fullMarks }]), 3.6);

  const maximum = calculateSubject([
    { kind: "theory", obtained: 75, fullMarks: subject.theoryMaximum },
    { kind: "practical", obtained: 25, fullMarks: subject.practicalMaximum }
  ]);
  assert.equal(maximum.obtained, 100);
  assert.equal(maximum.grade.letter, "A+");

  const zero = calculateSubject([
    { kind: "theory", obtained: 0, fullMarks: subject.theoryMaximum },
    { kind: "practical", obtained: 25, fullMarks: subject.practicalMaximum }
  ]);
  assert.equal(zero.obtained, 25);
  assert.equal(zero.fullMarks, 100);
  assert.throws(() => calculateSubject([
    { kind: "theory", obtained: -0.1, fullMarks: subject.theoryMaximum }
  ]), RangeError);
  assert.throws(() => calculateSubject([
    { kind: "practical", obtained: 25.1, fullMarks: subject.practicalMaximum }
  ]), RangeError);
  assert.equal(calculateSubject([
    { kind: "theory", obtained: null, fullMarks: subject.theoryMaximum },
    { kind: "practical", obtained: 0, fullMarks: subject.practicalMaximum }
  ]).incomplete, true);
  assert.equal(calculateSubject([
    { kind: "theory", obtained: 60.5, fullMarks: subject.theoryMaximum },
    { kind: "practical", obtained: 20.5, fullMarks: subject.practicalMaximum }
  ]).obtained, 81);
});

test("includes separately sourced Grade XI and XII historical distributions", () => {
  const xi = NEB_XI_XII_CATALOGUE.filter(subject => subject.level === "XI");
  const xii = NEB_XI_XII_CATALOGUE.filter(subject => subject.level === "XII");
  assert.equal(xi.length, 114);
  assert.equal(xii.length, 114);
  assert.equal(xi.find(subject => subject.name === "Computer Science").theoryMaximum, 50);
  assert.equal(xi.find(subject => subject.name === "Computer Science").practicalMaximum, 50);
  assert.equal(xii.find(subject => subject.name === "Computer Science").subjectCode, "4281");
  assert.equal(xii.find(subject => subject.name === "Legal Drafting").theoryMaximum, 50);
  assert.equal(xii.find(subject => subject.name === "Legal Drafting").practicalMaximum, 50);
  for (const subject of [...xi, ...xii]) {
    assert.ok(subject.creditHours > 0);
    assert.ok(subject.theoryCreditHours !== null || subject.practicalCreditHours !== null);
    assert.equal(subject.theoryPassMarks, null);
    assert.equal(subject.applicabilityAfterYear, null);
    assert.equal(subject.verification, "historical-official-distribution-current-validity-unverified");
    assert.equal(subject.source.year, "2078");
  }
});

test("reports source-derived catalogue audit counts and unresolved current research", () => {
  assert.equal(SUBJECT_CATALOGUE.length, 239);
  assert.ok(SUBJECT_SOURCE_REGISTRY.length >= 5);
  assert.deepEqual(createSubjectCatalogueAudit(), [
    {
      level: "SEE", checked: 11, historicalOfficialDistributions: 0, currentlyVerified: 11,
      seventyFiveTwentyFive: 9, fiftyFifty: 2, otherDistributions: 0, requiringResearch: 11
    },
    {
      level: "XI", checked: 114, historicalOfficialDistributions: 114, currentlyVerified: 0,
      seventyFiveTwentyFive: 91, fiftyFifty: 23, otherDistributions: 0, requiringResearch: 114
    },
    {
      level: "XII", checked: 114, historicalOfficialDistributions: 114, currentlyVerified: 0,
      seventyFiveTwentyFive: 90, fiftyFifty: 24, otherDistributions: 0, requiringResearch: 114
    }
  ]);
});

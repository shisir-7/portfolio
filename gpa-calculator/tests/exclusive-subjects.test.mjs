import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAggregateTotals,
  MUTUALLY_EXCLUSIVE_GROUPS,
  normalizeExclusiveName,
  resolveExclusiveWinner,
  subjectsForCalculation,
  subjectHasEntries
} from "../js/calculator.js";

/**
 * Builds a subject stub with the same shape the UI uses.
 */
function subject(name, entries = {}) {
  return {
    name,
    theoryObtained: "",
    practicalObtained: "",
    theoryGrade: "",
    practicalGrade: "",
    letterGrade: "",
    exclusiveChoice: false,
    ...entries
  };
}

const MATH = "Mathematics";
const SOCIAL = "Social Studies & Life Skill Education";

test("declares exactly one exclusive group: Mathematics and Social Studies", () => {
  assert.equal(MUTUALLY_EXCLUSIVE_GROUPS.length, 1);
  const [group] = MUTUALLY_EXCLUSIVE_GROUPS;
  assert.ok(group.includes("mathematics"));
  assert.ok(group.includes("social studies"));
});

test("normalises both member names to their group keys", () => {
  assert.equal(normalizeExclusiveName(MATH), "mathematics");
  assert.equal(normalizeExclusiveName("Com. Mathematics"), "mathematics");
  assert.equal(normalizeExclusiveName(SOCIAL), "social studies");
  assert.equal(normalizeExclusiveName("Com. Social Studies & Life Skill"), "social studies");
  assert.equal(normalizeExclusiveName("Physics"), "physics");
});

test("detects whether a subject carries any entry", () => {
  assert.equal(subjectHasEntries(subject(MATH)), false);
  assert.equal(subjectHasEntries({ name: MATH }), false);
  assert.equal(subjectHasEntries(subject(MATH, { theoryObtained: "60" })), true);
  assert.equal(subjectHasEntries(subject(MATH, { practicalObtained: "20" })), true);
  assert.equal(subjectHasEntries(subject(MATH, { theoryGrade: "A" })), true);
  assert.equal(subjectHasEntries(subject(MATH, { practicalGrade: "B+" })), true);
  assert.equal(subjectHasEntries(subject(MATH, { letterGrade: "A+" })), true);
  assert.equal(subjectHasEntries({
    name: SOCIAL,
    components: [{ kind: "theory", obtained: "60", fullMarks: "75" }]
  }), true);
  assert.equal(subjectHasEntries({
    name: SOCIAL,
    components: [{ kind: "theory", grade: { letter: "A" } }]
  }), true);
});

test("excludes Social Studies when Mathematics is filled in", () => {
  const subjects = [
    subject("English", { theoryObtained: "60" }),
    subject(MATH, { theoryObtained: "60" }),
    subject(SOCIAL)
  ];
  const winner = resolveExclusiveWinner(subjects);
  assert.equal(winner.name, MATH);
  const active = subjectsForCalculation(subjects);
  assert.equal(active.length, 2);
  assert.ok(active.some(s => s.name === MATH));
  assert.ok(!active.some(s => s.name === SOCIAL));
});

test("excludes Mathematics when Social Studies is filled in", () => {
  const subjects = [
    subject("English", { theoryObtained: "60" }),
    subject(MATH),
    subject(SOCIAL, { theoryObtained: "40" })
  ];
  const winner = resolveExclusiveWinner(subjects);
  assert.equal(winner.name, SOCIAL);
  const active = subjectsForCalculation(subjects);
  assert.equal(active.length, 2);
  assert.ok(active.some(s => s.name === SOCIAL));
  assert.ok(!active.some(s => s.name === MATH));
});

test("letter-grade entry selects one exclusive subject and excludes the other", () => {
  const subjects = [
    subject(MATH),
    subject(SOCIAL, { theoryGrade: "A", practicalGrade: "B+" })
  ];

  assert.equal(resolveExclusiveWinner(subjects).name, SOCIAL);
  assert.deepEqual(subjectsForCalculation(subjects), [subjects[1]]);
});

test("the disabled subject contributes nothing to the calculation", () => {
  // Only the filled-in subject may reach the aggregate.
  const subjects = [
    subject(MATH, { theoryObtained: "60", practicalObtained: "20" }),
    subject(SOCIAL, { theoryObtained: "40", practicalObtained: "10" })
  ];
  const active = subjectsForCalculation(subjects);
  assert.equal(active.length, 1);
  assert.equal(active[0].name, MATH);
  // The excluded subject is never counted as a zero, a fail, or extra credit.
  assert.ok(!active.some(s => s.name === SOCIAL));
});

test("aggregate marks and subject counts exclude the unselected group member", () => {
  const totals = calculateAggregateTotals([
    {
      name: MATH,
      exclusiveChoice: false,
      verification: "verified-current",
      components: [{ kind: "theory", obtained: "75", fullMarks: "75" }]
    },
    {
      name: SOCIAL,
      exclusiveChoice: true,
      verification: "historical",
      components: [{ kind: "theory", obtained: "60", fullMarks: "100" }]
    }
  ]);

  assert.equal(totals.theoryMaximum, 100);
  assert.equal(totals.theoryObtained, 60);
  assert.equal((totals.theoryObtained / totals.theoryMaximum) * 100, 60);
  assert.equal(totals.subjects, 1);
  assert.equal(totals.currentlyVerifiedSubjects, 0);
  assert.equal(totals.historicalOrUnverifiedSubjects, 1);
});

test("an explicit choice wins over which field was typed into last", () => {
  const subjects = [
    subject(MATH),
    subject(SOCIAL, { exclusiveChoice: true })
  ];
  const winner = resolveExclusiveWinner(subjects);
  assert.equal(winner.name, SOCIAL);
  assert.equal(subjectsForCalculation(subjects).length, 1);
  assert.equal(subjectsForCalculation(subjects)[0].name, SOCIAL);
});

test("the earlier-listed subject wins when both are filled in", () => {
  const subjects = [
    subject(MATH, { theoryObtained: "60" }),
    subject(SOCIAL, { theoryObtained: "40" })
  ];
  assert.equal(resolveExclusiveWinner(subjects).name, MATH);
  assert.equal(subjectsForCalculation(subjects).length, 1);
});

test("with no entries the first-listed subject stays selectable", () => {
  const subjects = [subject(MATH), subject(SOCIAL)];
  assert.equal(resolveExclusiveWinner(subjects), null);
  assert.deepEqual(subjectsForCalculation(subjects), subjects);
});

test("subjects outside the group are never excluded", () => {
  const subjects = [
    subject("English", { theoryObtained: "60" }),
    subject("Nepali", { theoryObtained: "70" }),
    subject("Physics", { theoryObtained: "80" }),
    subject("Chemistry", { theoryObtained: "50" })
  ];
  assert.equal(resolveExclusiveWinner(subjects), null);
  assert.equal(subjectsForCalculation(subjects).length, 4);
});

test("a single member of the group is never excluded", () => {
  const subjects = [subject(MATH, { theoryObtained: "60" })];
  assert.equal(resolveExclusiveWinner(subjects), null);
  assert.equal(subjectsForCalculation(subjects).length, 1);
});

test("switching the exclusive choice moves the contribution to the other subject", () => {
  const math = subject(MATH, { theoryObtained: "60" });
  const social = subject(SOCIAL);
  let subjects = [math, social];
  assert.equal(resolveExclusiveWinner(subjects).name, MATH);

  // The student picks Social Studies instead.
  math.exclusiveChoice = false;
  math.theoryObtained = "";
  social.exclusiveChoice = true;

  assert.equal(resolveExclusiveWinner(subjects).name, SOCIAL);
  assert.equal(subjectsForCalculation(subjects).length, 1);
  assert.equal(subjectsForCalculation(subjects)[0].name, SOCIAL);
});

test("handles an empty subject list", () => {
  assert.equal(resolveExclusiveWinner([]), null);
  assert.deepEqual(subjectsForCalculation([]), []);
});

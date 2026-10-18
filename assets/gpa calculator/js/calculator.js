export const GRADE_BANDS = Object.freeze([
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

export function getGrade(percentage) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Percentage must be a number between 0 and 100.");
  }
  return GRADE_BANDS.find(band => percentage >= band.min) ?? null;
}

export function calculateSubject(components) {
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

export function calculateGPA(subjects) {
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

export function calculateMeanGPA(subjects) {
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

export function calculateCreditWeightedGPA(componentGrades) {
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

export function calculateComponentGradePoint(components) {
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

export function calculateAggregateTotals(subjects) {
  return subjects.reduce((totals, subject) => {
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

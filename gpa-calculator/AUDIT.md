# NEB GPA calculator: source and data audit

## Scope and limitation

The subject catalogue is a research aid, not a verified list of all currently offered subjects or combinations. A complete, current official matrix covering SEE and Grades XI–XII (subject names and codes, theory/internal marks, credits, pass thresholds, and GPA rules) was not verified. The April 2025 NEB SEE assessment framework verifies a 75-mark external written assessment and 25-mark internal assessment for English, Mathematics, Science and Technology, and Social Studies. It does not cover Nepali or provide component pass thresholds or GPA cutoffs. The calculator labels historical data and custom entries, leaves unverified values blank, and describes calculated results as estimates.

## Catalogue snapshot

| Level | Catalogue entries checked | Historical distributions transcribed | 75/25 | 50/50 | Verified current profiles | Still requiring current-policy research |
|---|---:|---:|---:|---:|---:|---:|
| SEE | 5 subject-name references | 0 | 4 | 0 | 4 | 5 |
| Grade XI | 114 | 114 | 91 | 23 | 0 | 114 |
| Grade XII | 114 | 114 | 90 | 24 | 0 | 114 |

The XI/XII entries are row-level transcriptions from a historical source; the counts do not imply that the catalogue is complete or that those distributions remain in force. Some source rows apply to only one grade, and the source does not provide the credit hours or component pass marks used by this calculator.

## Sources reviewed

1. **Internal (Practical) Marks Evaluation Scheme and Subject-wise Distribution of Theoretical & Internal (Practical) Marks, 2078** — [official NEB-hosted PDF](https://biratnagar.neb.gov.np/get-file/downloads/Downloads-202603251316403780.pdf). Its table was transcribed as a historical reference. The document itself is dated 2078; current applicability, credits, and pass marks are not established by it.
2. **Assessment Framework for Secondary Education Examination (SEE), April 2025** — [official NEB PDF](https://neb.gov.np/neb-notice-file/Notices-202610011508438468.pdf). It specifies 25 marks for internal assessment and 75 marks for the external written assessment in each of its four covered subjects (English, Mathematics, Science and Technology, and Social Studies). It discusses component grading/NG but does not define current component pass thresholds or GPA cutoffs, and does not cover Nepali.
3. **National Assessment Framework for Grade 12 (draft), August 2023** — [official NEB-hosted draft PDF](https://neb.gov.np/neb-notice-file/Notices-202610011512454018.pdf). The document is marked as a draft and is not used as a current marks-distribution authority.
4. **Curriculum Development Centre** — [official curriculum portal](https://moecdc.gov.np/). No complete current grade-wise subject-code, marks, credits, and pass-threshold matrix was verified during this review.
5. **SEE 2082 subject-registration notice** — [official SEE notice](https://see.gov.np/content/7/notice-regarding-subject-registration/). It did not provide an accessible full subject-wise marks/code table.
6. **NEB Class 12 GPA calculator** — [independent reference calculator](https://neb.collegeinfonepal.com/neb). Reviewed only as a cross-check; it is not treated as an official source.

## Calculation and UX safeguards

- Historical marks distributions are labeled **historical; verify current**. Subject profiles with unknown assessment details are not assigned generic marks, credits, or pass rules.
- Current SEE component maxima are configured only for the four subjects covered by the 2025 framework. Nepali's maxima remain blank because the reviewed framework does not cover it.
- The simplified interface omits component pass-mark and credit-hour fields. It calculates an equal-weight mean of subject grade points; this is an estimate, not a credit-weighted GPA. Marks and student name are not persisted; user-defined subject configurations are saved in local browser storage.
- Letter-grade entry and mark-based calculation use the calculator's indicative grade-point reference. Where component maxima are configured, letter-grade entry takes a separate grade per component and combines their grade points weighted by those maxima; subjects with no verified component split retain a single overall-grade selector. Current NEB grade boundaries, GPA method, pass policy, credits, and subject combinations have not been established as official by the reviewed material.
- The percentage-to-grade/grade-point reference was retained from the user-provided executive summary as an estimate. It is not represented as a current official directive. The overall GPA-letter bands are likewise indicative labels, not an independently verified NEB result classification.
- The 75/25 and 50/50 XI/XII totals above count only distributions transcribed from the historical NEB table. The SEE 75/25 profiles are current framework data and are counted separately as verified profiles. The catalogue audit is reproducible with `createSubjectCatalogueAudit()` and checked by the unit tests.

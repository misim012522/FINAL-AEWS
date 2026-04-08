# XGBoost SHAP Analysis

- Profile: `midterm_attendance_needs`
- Rows analyzed: `1000`
- Features: `previous_gpa, failed_subject_count, attendance_rate, academic_challenge_score, external_factor_score, midterm_grade`
- Predicted class distribution: `{'Low': 306, 'Medium': 311, 'High': 383}`

## Global Feature Importance

1. `previous_gpa` - mean |SHAP| = `2.827786`
2. `midterm_grade` - mean |SHAP| = `0.320879`
3. `failed_subject_count` - mean |SHAP| = `0.280343`
4. `external_factor_score` - mean |SHAP| = `0.032734`
5. `attendance_rate` - mean |SHAP| = `0.003732`
6. `academic_challenge_score` - mean |SHAP| = `0.000000`

## Per-Class Mean |SHAP|

- `previous_gpa`
  - Low: `2.855529`
  - Medium: `2.696112`
  - High: `2.931717`
- `midterm_grade`
  - Low: `0.682666`
  - Medium: `0.257037`
  - High: `0.022934`
- `failed_subject_count`
  - Low: `0.000000`
  - Medium: `0.226625`
  - High: `0.614406`
- `external_factor_score`
  - Low: `0.001890`
  - Medium: `0.096312`
  - High: `0.000000`
- `attendance_rate`
  - Low: `0.006094`
  - Medium: `0.005102`
  - High: `0.000000`
- `academic_challenge_score`
  - Low: `0.000000`
  - Medium: `0.000000`
  - High: `0.000000`

## Example Cases

- Row `0` predicted as `Low`
  - Probabilities: `{'Low': 0.9977686405181885, 'Medium': 0.0013051952701061964, 'High': 0.0009261904051527381}`
  - `previous_gpa` = `2.0` with SHAP `3.156137`
  - `midterm_grade` = `2.0` with SHAP `0.606983`
  - `attendance_rate` = `100.0` with SHAP `0.023412`
  - `external_factor_score` = `4.0` with SHAP `0.002559`
  - `academic_challenge_score` = `4.0` with SHAP `0.000000`
  - `failed_subject_count` = `1.0` with SHAP `0.000000`

- Row `7` predicted as `Medium`
  - Probabilities: `{'Low': 0.0018231257563456893, 'Medium': 0.996690034866333, 'High': 0.0014868187718093395}`
  - `previous_gpa` = `2.25` with SHAP `3.152540`
  - `failed_subject_count` = `1.0` with SHAP `0.157703`
  - `midterm_grade` = `2.25` with SHAP `0.148586`
  - `external_factor_score` = `4.0` with SHAP `-0.104419`
  - `attendance_rate` = `41.66666666666667` with SHAP `-0.003987`
  - `academic_challenge_score` = `5.0` with SHAP `0.000000`

- Row `1` predicted as `High`
  - Probabilities: `{'Low': 0.0006425007013604045, 'Medium': 0.0012870361097157001, 'High': 0.9980705380439758}`
  - `previous_gpa` = `3.0` with SHAP `2.912922`
  - `failed_subject_count` = `2.0` with SHAP `0.598600`
  - `midterm_grade` = `3.25` with SHAP `0.022863`
  - `external_factor_score` = `0.0` with SHAP `0.000000`
  - `attendance_rate` = `91.66666666666666` with SHAP `0.000000`
  - `academic_challenge_score` = `4.0` with SHAP `0.000000`

# SHAP Report for System Defense

## 1. Purpose of the SHAP Analysis

This SHAP analysis explains **why the trained XGBoost model makes its predictions** in the Academic Early Warning System.

For the current deployed model, the prediction is based only on the inputs used in the system workflow:

- `Midterm Grade`
- `Attendance`
- `Needs Assessment`

The needs assessment signals are represented inside the model through these features:

- `previous_gpa`
- `failed_subject_count`
- `academic_challenge_score`
- `external_factor_score`

So in practical system terms, the model is interpreting:

- academic performance from the student's **midterm grade**
- attendance behavior from the student's **attendance rate**
- academic and personal difficulties from the uploaded **needs assessment**

## 2. Model Analyzed

- Model: `XGBoost`
- Active profile: `midterm_attendance_needs`
- Rows analyzed: `1000`
- Classes predicted:
  - `Low`
  - `Medium`
  - `High`

Predicted class distribution on the analyzed dataset:

- `Low`: `306`
- `Medium`: `311`
- `High`: `383`

## 3. Features Used by the Current System

The trained model currently uses these six input features:

1. `previous_gpa`
2. `failed_subject_count`
3. `attendance_rate`
4. `academic_challenge_score`
5. `external_factor_score`
6. `midterm_grade`

### System-friendly interpretation

- `midterm_grade`
  - the uploaded midterm performance of the student
- `attendance_rate`
  - the uploaded attendance percentage of the student
- `previous_gpa`
  - previous GPA value coming from the AMU-uploaded needs assessment
- `failed_subject_count`
  - number of failed subjects reflected in the needs assessment data
- `academic_challenge_score`
  - academic challenge indicators from needs assessment, such as:
    - difficulty understanding lectures
    - struggles with specific subjects
    - weak study habits or time management
    - low motivation or engagement
    - poor comprehension or writing skills
- `external_factor_score`
  - external or personal factors from needs assessment, such as:
    - financial difficulties
    - family issues
    - part-time work / working student
    - physical health concerns
    - mental health concerns

## 4. What SHAP Means in the System

SHAP stands for **SHapley Additive exPlanations**.

In this system, SHAP helps explain:

- which feature influenced the prediction the most
- how strongly a feature contributed to the final output
- why a student may be classified into a risk level

This is useful for defense because it shows that the AI is **not a black box**.  
The model decision can be traced back to actual student indicators in the system.

## 5. Global SHAP Results

Using the current trained XGBoost model, the global feature importance based on mean absolute SHAP value is:

1. `previous_gpa` = `2.827786`
2. `midterm_grade` = `0.320879`
3. `failed_subject_count` = `0.280343`
4. `external_factor_score` = `0.032734`
5. `attendance_rate` = `0.003732`
6. `academic_challenge_score` = `0.000000`

## 6. Interpretation of the Global Results

### 6.1 Most influential factor

The strongest feature in the current trained model is:

- `previous_gpa`

This means the model is currently relying most heavily on the student's previous GPA value from the needs assessment.

### 6.2 Second and third strongest factors

The next strongest features are:

- `midterm_grade`
- `failed_subject_count`

This means the model is also strongly influenced by:

- how well the student performs during midterm
- how many subjects the student has failed

### 6.3 External factors are present but weaker

`external_factor_score` has some measurable contribution, but it is still much smaller than:

- previous GPA
- midterm grade
- failed subject count

This means the current model recognizes external/personal factors, but they do not yet dominate the prediction as strongly as academic indicators.

### 6.4 Attendance has very small contribution

`attendance_rate` has only a very small SHAP impact in the current trained model.

This means attendance is present in the model, but it is not being used strongly during prediction on the current dataset.

### 6.5 Academic challenge score is currently unused

`academic_challenge_score` has `0.000000` mean SHAP impact.

This means that in the current trained model, the academic challenge checklist values from the needs assessment are not influencing the prediction.

For defense, this is important to mention honestly:

- the feature exists in the model
- but based on the current trained dataset, the model did not learn to use it meaningfully

## 7. Per-Class SHAP Behavior

### `previous_gpa`

- `Low`: `2.855529`
- `Medium`: `2.696112`
- `High`: `2.931717`

Interpretation:

- previous GPA strongly affects prediction across all risk classes

### `midterm_grade`

- `Low`: `0.682666`
- `Medium`: `0.257037`
- `High`: `0.022934`

Interpretation:

- midterm grade contributes most strongly when separating lower-risk and mid-level cases

### `failed_subject_count`

- `Low`: `0.000000`
- `Medium`: `0.226625`
- `High`: `0.614406`

Interpretation:

- failed subject count becomes especially important when the model predicts `High` risk

### `external_factor_score`

- `Low`: `0.001890`
- `Medium`: `0.096312`
- `High`: `0.000000`

Interpretation:

- external factors have some role, especially around medium-risk cases, but are not strong enough in the current model to dominate high-risk predictions

### `attendance_rate`

- `Low`: `0.006094`
- `Medium`: `0.005102`
- `High`: `0.000000`

Interpretation:

- attendance is present but has very little learned importance in the current model

### `academic_challenge_score`

- `Low`: `0.000000`
- `Medium`: `0.000000`
- `High`: `0.000000`

Interpretation:

- academic challenge checklist signals are currently not affecting predictions in the trained model

## 8. Example SHAP-Based Explanations

### Example 1: Predicted `Low`

- `previous_gpa = 2.0`
- `midterm_grade = 2.0`
- `attendance_rate = 100.0`
- `external_factor_score = 4.0`

Top drivers:

- `previous_gpa` was the strongest contributor
- `midterm_grade` also influenced the output
- attendance and external score had only minor effect

### Example 2: Predicted `Medium`

- `previous_gpa = 2.25`
- `failed_subject_count = 1.0`
- `midterm_grade = 2.25`
- `external_factor_score = 4.0`

Top drivers:

- `previous_gpa`
- `failed_subject_count`
- `midterm_grade`

Interpretation:

- even with external factors present, the model still relies more on academic history and subject failure signals

### Example 3: Predicted `High`

- `previous_gpa = 3.0`
- `failed_subject_count = 2.0`
- `midterm_grade = 3.25`

Top drivers:

- `previous_gpa`
- `failed_subject_count`

Interpretation:

- high-risk predictions are strongly associated with weaker academic history and more failed subjects

## 9. Defense-Ready Conclusion

Based on the SHAP analysis of the trained XGBoost model:

1. The AI prediction in the system is explainable.
2. The model currently relies most on:
   - previous GPA
   - midterm grade
   - failed subject count
3. Needs assessment external factors are recognized, but currently have weaker influence than core academic indicators.
4. Attendance is included in the model, but it contributes only minimally in the present training result.
5. Academic challenge checklist signals are currently not contributing to prediction in the trained model.

## 10. Recommended Defense Statement

You may present it like this:

> “We used SHAP analysis to explain the contribution of each input variable in the trained XGBoost model. The current model is most influenced by previous GPA, midterm grade, and failed subject count. External needs-assessment factors are recognized but have smaller contribution in the present model, while attendance and academic challenge indicators contribute less based on the trained dataset. This shows that the model is explainable and that its decisions can be traced to actual student data rather than being treated as a black box.”

## 11. Supporting Files

Generated supporting artifacts:

- [xgboost_shap_analysis.json](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_shap_analysis.json)
- [xgboost_shap_analysis.md](c:\Users\Ian\Desktop\SYSTEM FOR 2ND SEM\stone\backend\xgboost_shap_analysis.md)


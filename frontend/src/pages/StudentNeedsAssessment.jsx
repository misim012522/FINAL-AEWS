import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, LoaderCircle } from 'lucide-react'
import { getPublicNeedsAssessment, submitPublicNeedsAssessment } from '../api'

const checkboxGroups = [
  {
    title: 'Current Academic Standing',
    fields: [
      ['on_probationary_status', 'On Probationary Status'],
      ['grade_2_5_or_below', 'At least one subject has a grade of 2.5'],
      ['gwa_2_5_or_below', 'GWA is 2.5 lower or below'],
      ['low_midterm_academic_performance', 'Low midterm academic performance'],
      ['difficulty_catching_up', 'Difficulty with catching up instructions'],
    ],
  },
  {
    title: 'Previous Academic Support Received',
    fields: [
      ['tutoring_sessions', 'Tutoring Sessions'],
      ['peer_mentoring', 'Peer Mentoring'],
      ['faculty_consultation', 'Faculty Consultation'],
      ['counselling_sessions', 'Counselling Sessions'],
      ['no_previous_support', 'None'],
    ],
  },
  {
    title: 'Academic Challenges',
    fields: [
      ['difficulty_understanding_lectures', 'Difficulty in Understanding Lectures'],
      ['struggles_specific_subjects', 'Struggles with Specific Subjects'],
      ['weak_study_habits_time_management', 'Weak Study Habits or Time Management'],
      ['low_motivation_engagement', 'Low Motivation or Engagement'],
      ['poor_comprehension_writing_skills', 'Poor Comprehension or Writing Skills'],
    ],
  },
  {
    title: 'External/Personal Factors Affecting Performance',
    fields: [
      ['financial_difficulties', 'Financial Difficulties'],
      ['physical_health_concerns', 'Physical Health-Related Concerns'],
      ['family_issues', 'Family Issues'],
      ['part_time_work_affecting_studies', 'Part-Time Work Affecting Studies'],
      ['mental_health_concerns', 'Mental Health-Related Concerns'],
      ['internet_issues', 'Internet / Connectivity Issues'],
    ],
  },
]

const initialForm = {
  admission_type: '',
  academic_adviser: '',
  on_probationary_status: false,
  grade_2_5_or_below: false,
  gwa_2_5_or_below: false,
  low_midterm_academic_performance: false,
  difficulty_catching_up: false,
  previous_year_semester: '',
  previous_gpa: '',
  failed_subject_count: '',
  regular_attendance: false,
  frequently_absent_or_late: false,
  tutoring_sessions: false,
  peer_mentoring: false,
  faculty_consultation: false,
  counselling_sessions: false,
  no_previous_support: false,
  difficulty_understanding_lectures: false,
  struggles_specific_subjects: false,
  weak_study_habits_time_management: false,
  low_motivation_engagement: false,
  poor_comprehension_writing_skills: false,
  financial_difficulties: false,
  physical_health_concerns: false,
  family_issues: false,
  part_time_work_affecting_studies: false,
  mental_health_concerns: false,
  internet_issues: false,
  notes: '',
}

export default function StudentNeedsAssessment() {
  const { token } = useParams()
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await getPublicNeedsAssessment(token)
        if (!cancelled) setMeta(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load form')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      await submitPublicNeedsAssessment(token, {
        ...form,
        previous_gpa: form.previous_gpa === '' ? null : Number(form.previous_gpa),
        failed_subject_count: form.failed_subject_count === '' ? null : Number(form.failed_subject_count),
        notes: form.notes.trim() || null,
      })
      setSuccess('Your needs assessment has been submitted successfully.')
      setMeta((prev) => ({ ...(prev || {}), status: 'completed', can_submit: false }))
    } catch (err) {
      setError(err.message || 'Failed to submit form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-cyan-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-xl shadow-slate-300/30 backdrop-blur">
        <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Needs Assessment Form</h1>
              <p className="text-sm text-white/85">Academic Early Warning System</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading form...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && success && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!loading && meta && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
                <p><span className="font-semibold">Student:</span> {meta.student_name || 'Student'}</p>
                {meta.student_id && <p className="mt-1"><span className="font-semibold">Student ID:</span> {meta.student_id}</p>}
                {meta.student_email && <p className="mt-1"><span className="font-semibold">Email:</span> {meta.student_email}</p>}
              </div>

              {!meta.can_submit ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                  This form was already completed. Thank you for submitting your response.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">General Information</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Admission Type</span>
                        <input
                          type="text"
                          value={form.admission_type}
                          onChange={(e) => setForm((prev) => ({ ...prev, admission_type: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Academic Adviser</span>
                        <input
                          type="text"
                          value={form.academic_adviser}
                          onChange={(e) => setForm((prev) => ({ ...prev, academic_adviser: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">GPA/Academic Performance from Previous Term</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Previous Year & Semester</span>
                        <input
                          type="text"
                          value={form.previous_year_semester}
                          onChange={(e) => setForm((prev) => ({ ...prev, previous_year_semester: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Previous GPA</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          value={form.previous_gpa}
                          onChange={(e) => setForm((prev) => ({ ...prev, previous_gpa: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">No. of Subjects Failed (If any)</span>
                        <input
                          type="number"
                          min="0"
                          value={form.failed_subject_count}
                          onChange={(e) => setForm((prev) => ({ ...prev, failed_subject_count: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">Attendance Record</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ['regular_attendance', 'Regular Attendance'],
                        ['frequently_absent_or_late', 'Frequently Absent / Late'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={Boolean(form[key])}
                            onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  {checkboxGroups.map((group) => (
                    <section key={group.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <h2 className="text-sm font-semibold text-slate-900">{group.title}</h2>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {group.fields.map(([key, label]) => (
                          <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={Boolean(form[key])}
                              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Additional notes</span>
                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Share any details you want AMU staff to know."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-700/20 hover:from-teal-800 hover:to-cyan-800 disabled:opacity-60"
                  >
                    {saving ? 'Submitting...' : 'Submit needs assessment'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

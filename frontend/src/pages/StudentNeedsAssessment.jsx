import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, LoaderCircle } from 'lucide-react'
import { getPublicNeedsAssessment, submitPublicNeedsAssessment } from '../api'

const EMPTY_FORM = {}

function normalizeSections(form) {
  if (!form || !Array.isArray(form.sections)) return []
  return [...form.sections]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => ({
      ...section,
      fields: Array.isArray(section.fields)
        ? [...section.fields].filter((field) => field?.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [],
    }))
}

function initialValuesFromSections(sections) {
  const values = {}
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === 'boolean') values[field.name] = false
      else values[field.name] = ''
    }
  }
  return values
}

function buildSubmissionPayload(values, sections) {
  const payload = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const rawValue = values[field.name]
      if (field.type === 'number') {
        payload[field.name] = rawValue === '' ? null : Number(rawValue)
      } else if (field.type === 'textarea' || field.type === 'text' || field.type === 'select') {
        payload[field.name] = String(rawValue ?? '').trim() || null
      } else {
        payload[field.name] = rawValue
      }
    }
  }
  return payload
}

function isEmptyRequiredValue(field, value) {
  if (field.type === 'boolean') return value !== true
  if (field.type === 'number') return value === '' || value === null || value === undefined
  return String(value ?? '').trim() === ''
}

function validateRequiredFields(values, sections) {
  const nextErrors = {}
  for (const section of sections) {
    for (const field of section.fields) {
      if (!field.required) continue
      if (isEmptyRequiredValue(field, values[field.name])) {
        nextErrors[field.name] = 'This field is required.'
      }
    }
  }
  return nextErrors
}

function renderField(field, value, setValue, error) {
  const sharedClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${
    error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
  }`
  const helpText = field.help_text ? <p className="mt-1 text-xs text-slate-500">{field.help_text}</p> : null
  const label = (
    <span className="mb-1 block text-sm font-medium text-slate-700">
      {field.label}
      {field.required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  )
  const errorText = error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null

  if (field.type === 'boolean') {
    return (
      <label key={field.id} className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm text-slate-700 hover:bg-slate-50 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(field.name, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <span>
          {field.label}
          {field.required ? <span className="ml-1 text-red-600">*</span> : null}
          {helpText}
          {errorText}
        </span>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label key={field.id} className="block">
        {label}
        <textarea
          rows={5}
          value={value ?? ''}
          onChange={(e) => setValue(field.name, e.target.value)}
          placeholder={field.placeholder || ''}
          className={sharedClass}
        />
        {helpText}
        {errorText}
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label key={field.id} className="block">
        {label}
        <select value={value ?? ''} onChange={(e) => setValue(field.name, e.target.value)} className={sharedClass}>
          <option value="">Select an option</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {helpText}
        {errorText}
      </label>
    )
  }

  return (
    <label key={field.id} className="block">
      {label}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? '0.01' : undefined}
        value={value ?? ''}
        onChange={(e) => setValue(field.name, e.target.value)}
        placeholder={field.placeholder || ''}
        className={sharedClass}
      />
      {helpText}
      {errorText}
    </label>
  )
}

export default function StudentNeedsAssessment() {
  const { token } = useParams()
  const [meta, setMeta] = useState(null)
  const [formTemplate, setFormTemplate] = useState(null)
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const sections = useMemo(() => normalizeSections(formTemplate), [formTemplate])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await getPublicNeedsAssessment(token)
        if (cancelled) return
        setMeta(data)
        setFormTemplate(data.form || null)
        setFormValues(initialValuesFromSections(normalizeSections(data.form)))
        setFieldErrors({})
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

  const setValue = (name, nextValue) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setFormValues((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = validateRequiredFields(formValues, sections)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Please complete all required fields before submitting.')
      return
    }
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      setFieldErrors({})
      await submitPublicNeedsAssessment(token, buildSubmissionPayload(formValues, sections))
      setSuccess('Your needs assessment has been submitted successfully.')
      setMeta((prev) => ({ ...(prev || {}), status: 'completed', can_submit: false }))
    } catch (err) {
      setError(err.message || 'Failed to submit form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-cyan-50 to-slate-100 px-4 py-6 sm:py-8">
      <div className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-xl shadow-slate-300/30 backdrop-blur sm:h-[calc(100vh-4rem)]">
        <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{formTemplate?.title || 'Needs Assessment Form'}</h1>
              <p className="text-sm text-white/85">Academic Early Warning System</p>
            </div>
          </div>
        </div>

        <div className="clean-scrollbar flex-1 overflow-y-auto px-6 py-6">
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
            <div className="space-y-5">
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
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Fields marked with <span className="text-red-600">*</span> are required.
                  </p>
                  {sections.map((section) => {
                    const allBoolean = section.fields.length > 0 && section.fields.every((field) => field.type === 'boolean')
                    return (
                      <section key={section.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
                        {section.description ? <p className="mt-1 text-sm text-slate-500">{section.description}</p> : null}
                        <div className={`mt-3 grid gap-3 ${allBoolean ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                          {section.fields.map((field) => renderField(field, formValues[field.name], setValue, fieldErrors[field.name]))}
                        </div>
                      </section>
                    )
                  })}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-700/20 hover:from-teal-800 hover:to-cyan-800 disabled:opacity-60"
                  >
                    {saving ? 'Submitting...' : 'Submit needs assessment'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Save, RotateCcw, Shield } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getAdminNeedsAssessmentForm, resetAdminNeedsAssessmentForm, updateAdminNeedsAssessmentForm } from '../api'

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function blankField(order = 1) {
  return {
    id: makeId('field'),
    name: makeId('custom'),
    label: 'New question',
    type: 'text',
    required: false,
    placeholder: '',
    help_text: '',
    options: [],
    order,
    active: true,
    locked: false,
  }
}

function blankSection(order = 1) {
  return {
    id: makeId('section'),
    title: 'New section',
    description: '',
    order,
    fields: [blankField(1)],
  }
}

export default function AdminNeedsAssessmentFormBuilder() {
  const navigate = useNavigate()
  const [formConfig, setFormConfig] = useState(null)
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
        const data = await getAdminNeedsAssessmentForm()
        if (!cancelled) setFormConfig(data.form)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load form config')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const updateSection = (sectionId, updates) => {
    setFormConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => section.id === sectionId ? { ...section, ...updates } : section),
    }))
  }

  const updateField = (sectionId, fieldId, updates) => {
    setFormConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        fields: section.fields.map((field) => field.id === fieldId ? { ...field, ...updates } : field),
      }),
    }))
  }

  const addSection = () => {
    setFormConfig((prev) => ({
      ...prev,
      sections: [...(prev?.sections || []), blankSection((prev?.sections?.length || 0) + 1)],
    }))
  }

  const addField = (sectionId) => {
    setFormConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        fields: [...section.fields, blankField(section.fields.length + 1)],
      }),
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const data = await updateAdminNeedsAssessmentForm({
        title: formConfig.title,
        description: formConfig.description,
        sections: formConfig.sections,
        status: formConfig.status || 'published',
      })
      setFormConfig(data.form)
      setSuccess('Needs assessment form updated.')
    } catch (err) {
      setError(err.message || 'Failed to save form config')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const data = await resetAdminNeedsAssessmentForm()
      setFormConfig(data.form)
      setSuccess('Needs assessment form reset to default.')
    } catch (err) {
      setError(err.message || 'Failed to reset form config')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle="Needs Assessment Form Builder" icon={Shield} variant="admin">
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </button>

        <div className="flex h-[calc(100vh-12rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Needs Assessment Form Builder</h1>
              <p className="mt-1 text-sm text-slate-500">Edit the sections, questions, and helper text shown in the student needs assessment form.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleReset} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <RotateCcw className="h-4 w-4" />
                Reset default
              </button>
              <button type="button" onClick={handleSave} disabled={saving || loading || !formConfig} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="clean-scrollbar flex-1 overflow-y-auto px-6 py-6">
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {success ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            {loading || !formConfig ? (
              <div className="mt-2 text-sm text-slate-500">Loading form builder...</div>
            ) : (
              <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Form title</span>
                  <input value={formConfig.title || ''} onChange={(e) => setFormConfig((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
                  <input value={formConfig.description || ''} onChange={(e) => setFormConfig((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
                </label>
              </div>

              {formConfig.sections.map((section) => (
                <section key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Section title</span>
                      <input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Section description</span>
                      <input value={section.description || ''} onChange={(e) => updateSection(section.id, { description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
                    </label>
                    <button type="button" onClick={() => addField(section.id)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100">
                      <Plus className="h-4 w-4" />
                      Add field
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.fields.map((field) => (
                      <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Label</span>
                            <input value={field.label} onChange={(e) => updateField(section.id, field.id, { label: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
                            <select value={field.type} disabled={field.locked} onChange={(e) => updateField(section.id, field.id, { type: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100">
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="number">Number</option>
                              <option value="boolean">Checkbox</option>
                              <option value="select">Select</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Field key</span>
                            <input value={field.name} disabled={field.locked} onChange={(e) => updateField(section.id, field.id, { name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Placeholder</span>
                            <input value={field.placeholder || ''} onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400" />
                          </label>
                        </div>
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Help text</span>
                          <input value={field.help_text || ''} onChange={(e) => updateField(section.id, field.id, { help_text: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400" />
                        </label>
                        <div className="mt-3 flex items-center gap-4 text-sm text-slate-700">
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={Boolean(field.required)} onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                            Required
                          </label>
                          {field.locked ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Protected core field</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Plus className="h-4 w-4" />
                Add section
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

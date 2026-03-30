import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import {
  getAdminAnalyticsDepartmentChart,
  getAdminAnalyticsRiskDistribution,
  getAdminAnalyticsAccuracy,
} from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function AdminSystemAnalytics() {
  const { role } = useAuth()
  const [deptData, setDeptData] = useState([])
  const [riskDistribution, setRiskDistribution] = useState([])
  const [accuracyData, setAccuracyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (role !== 'admin') {
      setDeptData([])
      setRiskDistribution([])
      setAccuracyData([])
      setLoading(false)
      setError(null)
      return () => {
        isMounted = false
      }
    }
    Promise.all([
      getAdminAnalyticsDepartmentChart('all'),
      getAdminAnalyticsRiskDistribution('all'),
      getAdminAnalyticsAccuracy(),
    ])
      .then(([dept, risk, acc]) => {
        if (isMounted) {
          setDeptData(Array.isArray(dept) ? dept : [])
          setRiskDistribution(Array.isArray(risk) ? risk : [])
          setAccuracyData(Array.isArray(acc) ? acc : [])
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load analytics')
          setDeptData([])
          setRiskDistribution([])
          setAccuracyData([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [role])

  const latestAccuracy = accuracyData.length > 0 ? accuracyData[accuracyData.length - 1] : null
  const latestModels = latestAccuracy?.allModels || {}
  const profileMeta = {
    early_warning: {
      label: 'Early Warning',
      description: 'Uses pre-grade risk signals only: prior GPA, failed subjects, attendance, and needs assessment factors.',
    },
    midterm_endterm: {
      label: 'Midterm/End-Term',
      description: 'Includes grade components like class standing, laboratory, major output, and midterm/final term grades.',
    },
  }
  const activeProfile = profileMeta[latestAccuracy?.profile] || {
    label: latestAccuracy?.profile || 'Unknown Profile',
    description: 'No profile description available.',
  }
  const modelCards = [
    { key: 'xgboost', label: 'XGBoost', color: 'text-cyan-600' },
    { key: 'random_forest', label: 'Random Forest', color: 'text-emerald-600' },
    { key: 'ensemble', label: 'Ensemble', color: 'text-blue-600' },
  ]

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading analytics…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <p className="text-xs font-semibold text-blue-900">{activeProfile.label} Model View</p>
        <p className="text-[11px] text-blue-800 mt-1">{activeProfile.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Best Accuracy</p>
          <p className="text-lg font-bold text-cyan-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.accuracy}%` : 'No data'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {latestAccuracy?.bestModel ? `${latestAccuracy.bestModel} holdout` : 'Holdout set'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Precision</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.precision}%` : 'No data'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Weighted average</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Recall</p>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.recall}%` : 'No data'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Weighted average</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Last Trained</p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {latestAccuracy?.month || 'No data'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {latestAccuracy?.profile ? `Profile: ${activeProfile.label}` : 'Retrain to generate metrics'}
          </p>
          <p className="text-[10px] text-gray-500">
            {latestAccuracy?.bestModel ? `Best model: ${latestAccuracy.bestModel}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {modelCards.map((model) => {
          const metrics = latestModels[model.key]
          return (
            <div key={model.key} className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">{model.label}</p>
              <p className={`text-lg font-bold mt-1 ${model.color}`}>
                {metrics ? `${(metrics.holdout_accuracy * 100).toFixed(2)}%` : 'No data'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {metrics ? `CV ${(metrics.cv_mean_accuracy * 100).toFixed(2)}%` : 'Waiting for retrain'}
              </p>
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
          At-Risk Students by Department
        </h2>
        <p className="text-[10px] text-gray-500 mb-1.5">All departments — current semester</p>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
            <div className="h-36 min-w-0">
              {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={144} minWidth={240}>
                <BarChart data={deptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  <Bar dataKey="atRisk" name="At Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" name="Total Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-gray-500">
                No department data yet. Add instructors and classes to see the chart.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div>
          <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
            <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
            {activeProfile.label} Accuracy History
          </h2>
          <p className="text-[10px] text-gray-500 mb-1.5">
            {latestAccuracy?.profile === 'early_warning'
              ? 'Tracks honest early-warning performance using non-grade signals.'
              : 'Tracks performance when grade components are included.'}
          </p>
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
            <div className="h-32 min-w-0">
              {accuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={128} minWidth={240}>
                  <LineChart data={accuracyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(v, name) => [`${v}%`, name]}
                    />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="precision" name="Precision %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="recall" name="Recall %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-gray-500">
                  No accuracy data yet. Will appear when AI pipeline stores history.
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
            <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
            Risk Level Distribution
          </h2>
          <p className="text-[10px] text-gray-500 mb-1.5">Enrollments by risk level</p>
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
            <div className="h-32 flex items-center justify-center min-w-0">
              {riskDistribution.some((d) => (d.value ?? 0) > 0) ? (
                <ResponsiveContainer width="100%" height={128} minWidth={240}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {riskDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[11px] text-gray-500">
                  No risk data yet. Risk is computed per enrollment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

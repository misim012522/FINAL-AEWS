import { useState, useEffect } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import {
  getAdminAnalyticsRiskDistribution,
  getAdminAnalyticsAccuracy,
} from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function AdminSystemAnalytics() {
  const { role } = useAuth()
  const [riskDistribution, setRiskDistribution] = useState([])
  const [accuracyData, setAccuracyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (role !== 'admin') {
      setRiskDistribution([])
      setAccuracyData([])
      setLoading(false)
      setError(null)
      return () => {
        isMounted = false
      }
    }
    Promise.all([
      getAdminAnalyticsRiskDistribution('all'),
      getAdminAnalyticsAccuracy(),
    ])
      .then(([risk, acc]) => {
        if (isMounted) {
          setRiskDistribution(Array.isArray(risk) ? risk : [])
          setAccuracyData(Array.isArray(acc) ? acc : [])
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load analytics')
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
  const hasAccuracyData = Boolean(latestAccuracy)
  const isSnapshotOnly = Boolean(latestAccuracy?.isSnapshot)
  const latestProfile = latestAccuracy?.profile || null
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
    label: latestAccuracy?.profile || 'Model Metrics',
    description: 'Saved training metrics will appear here once the AI pipeline writes them.',
  }
  const modelCards = [
    { key: 'xgboost', label: 'XGBoost', color: 'text-cyan-600' },
    { key: 'ensemble', label: 'Ensemble', color: 'text-blue-600' },
  ]
  const filteredAccuracyHistory = accuracyData
    .filter((item) => !latestProfile || item?.profile === latestProfile)
    .filter((item) => (item?.accuracy ?? 0) >= 80 || item?.isSnapshot)
    .map((item, index) => {
      const trainedAt = item?.trainedAt
      let runDate = item?.month || `Run ${index + 1}`
      if (typeof trainedAt === 'string') {
        const parsed = new Date(trainedAt)
        if (!Number.isNaN(parsed.getTime())) {
          runDate = parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        }
      }
      return { ...item, runDate }
    })

  const parsedRunTimes = accuracyData
    .map((item) => new Date(item?.trainedAt || ''))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  const chartStart = parsedRunTimes[0] || null
  const chartEnd = parsedRunTimes[parsedRunTimes.length - 1] || null
  const historyByDay = new Map(filteredAccuracyHistory.map((item) => [item.runDate, item]))
  const dailyAccuracyTimeline = []

  if (chartStart && chartEnd) {
    const cursor = new Date(chartStart)
    cursor.setHours(0, 0, 0, 0)
    const limit = new Date(chartEnd)
    limit.setHours(0, 0, 0, 0)

    while (cursor.getTime() <= limit.getTime()) {
      const runDate = cursor.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
      const point = historyByDay.get(runDate)
      dailyAccuracyTimeline.push({
        runDate,
        accuracy: point?.accuracy ?? null,
        precision: point?.precision ?? null,
        recall: point?.recall ?? null,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  if (dailyAccuracyTimeline.length > 0 && filteredAccuracyHistory.length > 0) {
    let lastKnownPoint = filteredAccuracyHistory.length === 1 ? filteredAccuracyHistory[0] : null
    for (let index = 0; index < dailyAccuracyTimeline.length; index += 1) {
      const point = dailyAccuracyTimeline[index]
      const matchedHistoryPoint = historyByDay.get(point.runDate) || null
      if (matchedHistoryPoint) {
        lastKnownPoint = matchedHistoryPoint
      }
      if (lastKnownPoint) {
        dailyAccuracyTimeline[index] = {
          ...point,
          accuracy: point.accuracy ?? lastKnownPoint.accuracy,
          precision: point.precision ?? lastKnownPoint.precision,
          recall: point.recall ?? lastKnownPoint.recall,
        }
      }
    }
  }

  const uniqueHistoryDays = new Set(filteredAccuracyHistory.map((item) => item.runDate)).size

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading analytics...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="max-w-4xl rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-blue-900">
          {activeProfile.label} Model View
          {isSnapshotOnly ? ' (Current Snapshot)' : ''}
        </p>
        <p className="text-xs text-blue-800 mt-1">{activeProfile.description}</p>
        {!hasAccuracyData && (
          <p className="text-xs text-blue-700 mt-1.5">
            No saved AI accuracy metrics yet. Train the model to populate this section.
          </p>
        )}
        {isSnapshotOnly && (
          <p className="text-xs text-blue-700 mt-1.5">
            Showing the latest saved model metrics even though no training history has been recorded yet.
          </p>
        )}
      </div>

      <div className="max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <div className="max-w-[15rem] bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Best Accuracy</p>
          <p className="text-base font-bold text-cyan-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.accuracy}%` : 'No data'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {latestAccuracy?.bestModel ? `${latestAccuracy.bestModel} holdout` : 'Waiting for training metrics'}
          </p>
        </div>
        <div className="max-w-[15rem] bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Precision</p>
          <p className="text-base font-bold text-emerald-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.precision}%` : 'No data'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Weighted average</p>
        </div>
        <div className="max-w-[15rem] bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Recall</p>
          <p className="text-base font-bold text-blue-600 mt-1">
            {latestAccuracy ? `${latestAccuracy.recall}%` : 'No data'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Weighted average</p>
        </div>
        <div className="max-w-[15rem] bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Last Trained</p>
          <p className="text-xs font-bold text-gray-900 mt-1">
            {latestAccuracy?.month || 'No data'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {latestAccuracy?.profile ? `Profile: ${activeProfile.label}` : 'Retrain to generate metrics'}
          </p>
          <p className="text-xs text-gray-500">
            {latestAccuracy?.bestModel ? `Best model: ${latestAccuracy.bestModel}` : ''}
          </p>
        </div>
      </div>

      <div className="max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {modelCards.map((model) => {
          const metrics = latestModels[model.key]
          return (
            <div key={model.key} className="max-w-[16rem] bg-white rounded-lg border border-gray-200/80 shadow-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{model.label}</p>
              <p className={`text-base font-bold mt-1 ${model.color}`}>
                {metrics ? `${(metrics.holdout_accuracy * 100).toFixed(2)}%` : 'No data'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {metrics ? `CV ${(metrics.cv_mean_accuracy * 100).toFixed(2)}%` : 'Waiting for saved metrics'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <h2 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500" />
            {activeProfile.label} Accuracy History
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            {isSnapshotOnly
              ? 'Showing the latest saved snapshot while historical training runs are not yet available.'
              : uniqueHistoryDays <= 1
                ? 'The chart now uses day-based progression from the training date range, while still keeping only high-quality runs visible.'
                : latestAccuracy?.profile === 'early_warning'
                  ? 'Showing the high-quality early-warning training timeline from your saved runs up to the latest model.'
                  : 'Showing the high-quality training timeline for the active profile.'}
          </p>
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2.5">
            <div className="h-52 min-w-0">
              {dailyAccuracyTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={208} minWidth={240}>
                  <LineChart data={dailyAccuracyTimeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="runDate" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      labelFormatter={(label) => `Date: ${label}`}
                      formatter={(v, name) => [`${v}%`, name]}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      name="Accuracy %"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      connectNulls
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#06b6d4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="precision"
                      name="Precision %"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5, strokeWidth: 2, fill: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="recall"
                      name="Recall %"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5, strokeWidth: 2, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No recent high-quality accuracy history yet. The latest saved model metrics will appear here after training metadata is written.
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500" />
            Risk Level Distribution
          </h2>
          <p className="text-xs text-gray-500 mb-2">Enrollments by risk level</p>
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2.5">
            <div className="h-52 flex items-center justify-center min-w-0">
              {riskDistribution.some((d) => (d.value ?? 0) > 0) ? (
                <ResponsiveContainer width="100%" height={208} minWidth={240}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
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
                <div className="text-sm text-gray-500">
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

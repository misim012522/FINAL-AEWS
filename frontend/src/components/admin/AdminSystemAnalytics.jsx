import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import {
  getAdminAnalyticsDepartmentChart,
  getAdminAnalyticsRiskDistribution,
  getAdminAnalyticsAccuracy,
} from '../../api'

export default function AdminSystemAnalytics() {
  const [deptData, setDeptData] = useState([])
  const [riskDistribution, setRiskDistribution] = useState([])
  const [accuracyData, setAccuracyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
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
  }, [])

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

      <div>
        <h2 className="text-xs font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          <span className="w-0.5 h-2.5 rounded-full bg-blue-500" />
          At-Risk Students by Department
        </h2>
        <p className="text-[10px] text-gray-500 mb-1.5">All departments — current semester</p>
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
          <div className="h-36">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
            AI Prediction Accuracy (30-day)
          </h2>
          <p className="text-[10px] text-gray-500 mb-1.5">Model accuracy over time</p>
          <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-2">
            <div className="h-32">
              {accuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis domain={[80, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(v) => [`${v}%`, 'Accuracy']} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
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
            <div className="h-32 flex items-center justify-center">
              {riskDistribution.some((d) => (d.value ?? 0) > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
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

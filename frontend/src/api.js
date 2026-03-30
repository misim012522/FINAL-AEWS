/** Upload gradesheet/attendance files for a class (CSV/XLSX). */
/** Upload classlist and create class automatically. */
export async function uploadAndCreateClasslist(files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const user = JSON.parse(localStorage.getItem('auth') || '{}')
  const instructorId = user?.user?.id
  if (!instructorId) {
    throw new Error('Instructor ID not found')
  }
  formData.append('instructor_id', instructorId)
  const res = await fetch(`${API_BASE}/api/classes/upload-classlist`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Upload failed')
  }
  return data
}

export async function uploadClassFiles(classId, files, type) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  formData.append('type', type);
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Upload failed');
  }
  return data;
}

export async function uploadNeedsAssessmentFiles(classId, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/upload-needs-assessment`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Upload failed')
  }
  return data
}

export async function predictClassRisk(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/predict-risk`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to predict class risk')
  }
  return data
}

/** Preview classlist to fetch student names and IDs without saving. */
export async function previewClasslist(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/classes/preview-classlist`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Preview failed');
  }
  return data;
}

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function formatErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || `${d.loc?.join('.')}: invalid`).join('. ')
  }
  return typeof detail === 'string' ? detail : (detail?.message || 'Request failed')
}

/**
 * Get auth headers for RBAC (X-User-Id, X-User-Role).
 * Reads from localStorage 'auth' key.
 * For production, use proper JWT tokens instead.
 */
function getAuthHeaders() {
  const headers = {}
  try {
    const raw = localStorage.getItem('auth')
    if (raw) {
      const data = JSON.parse(raw)
      if (data?.user?.id) headers['X-User-Id'] = data.user.id
      if (data?.role) headers['X-User-Role'] = data.role
    }
  } catch (e) {
    console.error('Failed to parse auth token:', e)
  }
  return headers
}

export async function signup({ name, email, password, contact_number, department, role }) {
  const body = {
    name: String(name ?? '').trim(),
    email: String(email ?? '').trim(),
    password: String(password ?? ''),
    contact_number: String(contact_number ?? '').trim(),
    department: String(department ?? '').trim(),
    role: role || 'instructor',
  }
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Signup failed')
  }
  return data
}

export async function login({ email, password, role, recaptchaToken }) {
  const body = { email, password, role }
  if (recaptchaToken) body.recaptcha_token = recaptchaToken
  let res
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(err.message || 'Network error. Check your connection and try again.')
  }
  const raw = await res.text()
  const data = raw ? (() => { try { return JSON.parse(raw) } catch (e) { console.error('Parse error:', e); return {} } })() : {}
  if (!res.ok) {
    const msg = formatErrorDetail(data.detail) || res.statusText || 'Login failed'
    throw new Error(msg)
  }
  return data
}

export async function verifyEmail(token) {
  const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || res.statusText || 'Verification failed')
  }
  return data
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email ?? '').trim() }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Request failed')
  }
  return data
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Reset failed')
  }
  return data
}

/** Get a single user by id (any role). */
export async function getUser(userId) {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'User not found')
  }
  return data
}

/** List users (all roles or filter by role). Optional search by name/email. */
export async function listUsers(role = 'all', search = '') {
  const params = new URLSearchParams()
  if (role && role !== 'all') params.set('role', role)
  if (search && String(search).trim()) params.set('search', String(search).trim())
  const qs = params.toString()
  const url = `${API_BASE}/api/users${qs ? `?${qs}` : ''}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load users')
  }
  return Array.isArray(data) ? data : []
}

export async function updateUser(userId, payload) {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Update failed')
  }
  return data
}

export async function listClasses(instructorId) {
  const res = await fetch(`${API_BASE}/api/classes?instructor_id=${encodeURIComponent(instructorId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load classes')
  }
  return data
}

export async function getInstructorRiskAlerts(instructorId) {
  const res = await fetch(`${API_BASE}/api/classes/risk-alerts?instructor_id=${encodeURIComponent(instructorId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load risk alerts')
  }
  return Array.isArray(data) ? data : []
}

export async function getInstructorStudentList(instructorId) {
  const res = await fetch(`${API_BASE}/api/classes/instructor-students?instructor_id=${encodeURIComponent(instructorId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load student list')
  }
  return Array.isArray(data) ? data : []
}

/** List all interventions (admin). Optional status: 'all' | 'pending' | 'in-progress' | 'completed'. */
export async function listInterventions(status = 'all') {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  const qs = params.toString()
  const url = `${API_BASE}/api/interventions${qs ? `?${qs}` : ''}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load interventions')
  }
  return Array.isArray(data) ? data : []
}


/** Create a new intervention case from an AMU referral. */
export async function createIntervention(payload) {
  const res = await fetch(`${API_BASE}/api/interventions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to create intervention')
  }
  return data
}
/** Get a single intervention by id. */
export async function getIntervention(interventionId) {
  const res = await fetch(`${API_BASE}/api/interventions/${encodeURIComponent(interventionId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Intervention not found')
  }
  return data
}

/** Update an intervention (status, notes, etc.). */
export async function updateIntervention(interventionId, payload) {
  const res = await fetch(`${API_BASE}/api/interventions/${encodeURIComponent(interventionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to update intervention')
  }
  return data
}

export async function getClass(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load class')
  }
  return data
}

export async function listClassStudents(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/students`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load students')
  }
  return data
}

export async function createClass({ instructor_id, subject_code, subject_name }) {
  const res = await fetch(`${API_BASE}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instructor_id: String(instructor_id ?? '').trim(),
      subject_code: String(subject_code ?? '').trim(),
      subject_name: String(subject_name ?? '').trim(),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to create class')
  }
  return data
}

export async function listArchivedClasses(instructorId) {
  const res = await fetch(`${API_BASE}/api/classes/archived/list?instructor_id=${encodeURIComponent(instructorId)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load archived classes')
  }
  return Array.isArray(data) ? data : []
}

export async function archiveClass(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to archive class')
  }
  return data
}

export async function restoreClass(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/restore`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to restore class')
  }
  return data
}

export async function permanentDeleteClass(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/permanent-delete`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to delete class')
  }
  return true
}
 

export async function getClassRiskSummary(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/risk-summary`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load risk summary')
  }
  return data
}

export async function getClassGrades(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/grades`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load grades')
  }
  return data
}

export async function getClassAttendance(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/attendance`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load attendance')
  }
  return data
}

export async function getClassRoster(classId) {
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/roster`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load roster')
  }
  return data
}

export async function updateEnrollment(classId, studentIdentifier, payload) {
  const identifierEnc = encodeURIComponent(studentIdentifier)
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/students/${identifierEnc}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to update')
  }
  return data
}

export async function predictEnrollmentRisk(classId, studentEmail) {
  const emailEnc = encodeURIComponent(studentEmail)
  const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/students/${emailEnc}/predict-risk`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to predict risk')
  }
  return data
}

// ----- Notifications (for AMU staff, instructor, admin) -----

/** List notifications for a role (instructor, admin, amu-staff). */
export async function listNotifications(role) {
  const res = await fetch(`${API_BASE}/api/notifications?role=${encodeURIComponent(role)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load notifications')
  }
  return Array.isArray(data) ? data : []
}

/** Mark a notification as read. */
export async function markNotificationRead(notificationId) {
  const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ read: true }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to mark as read')
  }
  return data
}

/** Mark all notifications as read for a role. */
export async function markAllNotificationsRead(role) {
  const res = await fetch(`${API_BASE}/api/notifications/${role}/mark-all-read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to mark all as read')
  }
  return data
}

// ----- AMU Staff (real data) -----

/** List referrals (flagged enrollments) for AMU staff. */
export async function getAmuStaffReferrals(risk = '', search = '') {
  const params = new URLSearchParams()
  if (risk) params.set('risk', risk)
  if (search && String(search).trim()) params.set('search', String(search).trim())
  const qs = params.toString()
  const url = `${API_BASE}/api/amu-staff/referrals${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: getAuthHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load referrals')
  return Array.isArray(data) ? data : []
}

/** Get one referral by id (class_id::student_email). */
export async function getAmuStaffReferral(refId) {
  const res = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Referral not found')
  return data
}

export async function sendAmuStaffReferralEmail(refId, payload) {
  const res = await fetch(`${API_BASE}/api/amu-staff/referrals/${encodeURIComponent(refId)}/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      subject: String(payload?.subject ?? '').trim(),
      message: String(payload?.message ?? '').trim(),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to send email')
  return data
}

/** AMU overview counts. */
export async function getAmuStaffOverview() {
  const res = await fetch(`${API_BASE}/api/amu-staff/overview`, { headers: getAuthHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load overview')
  return data
}

/** AMU monthly reports. */
export async function getAmuStaffReports() {
  const res = await fetch(`${API_BASE}/api/amu-staff/reports`, { headers: getAuthHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load reports')
  return Array.isArray(data) ? data : []
}

// ----- Admin system overview (real data from DB) -----

/** List archived user accounts. Filter by role or search. */
export async function getAdminArchivedUsers(role = 'all', search = '') {
  const params = new URLSearchParams()
  if (role && role !== 'all') params.set('role', role)
  if (search && String(search).trim()) params.set('search', String(search).trim())
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/users/archived${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load archived users')
  }
  return Array.isArray(data) ? data : []
}

export async function archiveUser(userId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}/archive`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to archive user')
  }
  return data
}

export async function restoreUser(userId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to restore user')
  }
  return data
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to delete user')
  }
  return data
}

/** List all user accounts (instructor, admin, amu-staff). Filter by role or search. */
export async function getAdminUsers(role = 'all', search = '') {
  const params = new URLSearchParams()
  if (role && role !== 'all') params.set('role', role)
  if (search && String(search).trim()) params.set('search', String(search).trim())
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/users${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load users')
  }
  return Array.isArray(data) ? data : []
}

/** Pending accounts (instructor/amu-staff awaiting admin approval). */
export async function getAdminPendingAccounts() {
  const res = await fetch(`${API_BASE}/api/admin/pending-accounts`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load pending accounts')
  }
  return Array.isArray(data) ? data : []
}

export async function approvePendingAccount(userId) {
  const res = await fetch(`${API_BASE}/api/admin/pending-accounts/${encodeURIComponent(userId)}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to approve')
  }
  return data
}

export async function declinePendingAccount(userId) {
  const res = await fetch(`${API_BASE}/api/admin/pending-accounts/${encodeURIComponent(userId)}/decline`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to decline')
  }
  return data
}

/** Departments from instructors only (not admin/amu-staff). */
export async function getAdminInstructorDepartments() {
  const res = await fetch(`${API_BASE}/api/admin/departments`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load departments')
  }
  return Array.isArray(data) ? data : []
}

/** KPIs for system overview. department: 'all' or a department name from instructors. */
export async function getAdminOverview(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/overview${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load overview')
  }
  return data
}

/** Students at risk (High/Medium) with department from instructor. */
export async function getAdminStudentsAtRisk(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/overview/students-at-risk${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load students at risk')
  }
  return Array.isArray(data) ? data : []
}

/** Department-level stats (instructor departments only). */
export async function getAdminDepartmentsStats(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/overview/departments${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load department stats')
  }
  return Array.isArray(data) ? data : []
}

/** Instructors with class/student/at-risk counts. Filter by department (instructor's). */
export async function getAdminOverviewInstructors(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/overview/instructors${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load instructors')
  }
  return Array.isArray(data) ? data : []
}

/** Trend data for chart (current snapshot; no historical data in DB). */
export async function getAdminOverviewTrends(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/overview/trends${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load trends')
  }
  return Array.isArray(data) ? data : []
}

// ----- Admin System Analytics (real data) -----

/** At-risk and total by department for bar chart. department: 'all' or instructor department. */
export async function getAdminAnalyticsDepartmentChart(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/analytics/department-chart${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load department chart')
  }
  return Array.isArray(data) ? data : []
}

/** Risk level distribution (High, Medium, Low) for pie chart. */
export async function getAdminAnalyticsRiskDistribution(department = 'all') {
  const params = new URLSearchParams()
  if (department && department !== 'all') params.set('department', department)
  const qs = params.toString()
  const url = `${API_BASE}/api/admin/analytics/risk-distribution${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load risk distribution')
  }
  return Array.isArray(data) ? data : []
}

/** AI accuracy over time. Returns [] until AI pipeline stores history. */
export async function getAdminAnalyticsAccuracy() {
  const res = await fetch(`${API_BASE}/api/admin/analytics/accuracy`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load accuracy')
  }
  return Array.isArray(data) ? data : []
}

// ----- Admin Institution Reports (real data) -----

/** List available institution reports (from DB: instructor departments + fixed types). */
export async function getAdminReports() {
  const res = await fetch(`${API_BASE}/api/admin/reports`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Failed to load reports')
  }
  return Array.isArray(data) ? data : []
}

/** URL for report download. Use downloadAdminReport() to send auth headers; do not open in new tab or use as link href (would miss auth). */
export function getAdminReportDownloadUrl(reportId) {
  return `${API_BASE}/api/admin/reports/${encodeURIComponent(reportId)}/download`
}

/** Download a report as CSV with auth headers; triggers browser save. */
export async function downloadAdminReport(reportId, filename = 'report.csv') {
  const url = getAdminReportDownloadUrl(reportId)
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Download failed')
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Get student enrollment summary by email (admin). id param from Students at Risk is email. */
export async function getAdminStudentByEmail(studentEmail) {
  const encoded = encodeURIComponent(studentEmail)
  const res = await fetch(`${API_BASE}/api/admin/students/${encoded}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatErrorDetail(data.detail) || res.statusText || 'Student not found')
  }
  return data
}


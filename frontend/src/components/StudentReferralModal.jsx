import { useState, useRef, useEffect } from 'react'
import { X, Users, Search, ChevronDown } from 'lucide-react'
import HeaderAwareOverlay from './HeaderAwareOverlay'

const REFERRAL_REASONS = [
  {
    id: 'on_probation_status',
    label: 'On probation status',
  },
  {
    id: 'grade_2_5_or_below',
    label: 'At least one subject has a grade of 2.5 or below',
  },
  {
    id: 'gwa_2_5_or_below',
    label: 'GWA is 2.5 or below',
  },
  {
    id: 'low_midterm_performance',
    label: 'Low midterm academic performance',
  },
  {
    id: 'difficulty_catching_up',
    label: 'Difficulty with catching up instructions',
  },
]

export default function StudentReferralModal({
  isOpen,
  students,
  amuStaffOptions = [],
  instructorCollege = '',
  onClose,
  onSubmit,
  isSubmitting,
}) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredStudents, setFilteredStudents] = useState([])
  const [selectedAmuStaff, setSelectedAmuStaff] = useState('')
  const searchInputRef = useRef()
  const dropdownRef = useRef()

  const [selectedReasons, setSelectedReasons] = useState({
    on_probation_status: false,
    grade_2_5_or_below: false,
    gwa_2_5_or_below: false,
    low_midterm_performance: false,
    difficulty_catching_up: false,
  })

  // Filter AMU staff by instructor's college
  const filteredAmuStaff = amuStaffOptions.filter(
    (staff) => staff.college === instructorCollege
  )

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.documentElement.style.overflow = 'auto'
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Filter students based on search input
  useEffect(() => {
    if (!searchInput.trim()) {
      setFilteredStudents(students)
      return
    }

    const query = searchInput.toLowerCase()
    const filtered = students.filter((student) => {
      const name = (student.student_name || '').toLowerCase()
      const id = (student.student_id || '').toLowerCase()
      return name.includes(query) || id.includes(query)
    })
    setFilteredStudents(filtered)
  }, [searchInput, students])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleSelectStudent = (student) => {
    const identifier = student.student_email || student.student_id
    setSelectedStudent(identifier)
    setShowDropdown(false)
    setSearchInput('')
  }

  const selectedStudentData = students.find(
    (s) => (s.student_email || s.student_id) === selectedStudent
  )

  const handleReasonChange = (reasonId) => {
    setSelectedReasons((prev) => ({
      ...prev,
      [reasonId]: !prev[reasonId],
    }))
  }

  const handleSubmit = () => {
    if (!selectedStudent) {
      alert('Please select a student')
      return
    }

    if (!selectedAmuStaff) {
      alert('Please select an AMU staff member')
      return
    }

    if (!selectedStudentData) return

    onSubmit({
      student: selectedStudentData,
      reasons: selectedReasons,
      amuStaff: selectedAmuStaff,
    })

    // Reset form
    setSelectedStudent('')
    setSearchInput('')
    setSelectedAmuStaff('')
    setSelectedReasons({
      on_probation_status: false,
      grade_2_5_or_below: false,
      gwa_2_5_or_below: false,
      low_midterm_performance: false,
      difficulty_catching_up: false,
    })
  }

  const handleClose = () => {
    setSelectedStudent('')
    setSearchInput('')
    setShowDropdown(false)
    setSelectedAmuStaff('')
    setSelectedReasons({
      on_probation_status: false,
      grade_2_5_or_below: false,
      gwa_2_5_or_below: false,
      low_midterm_performance: false,
      difficulty_catching_up: false,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <HeaderAwareOverlay
      role="dialog"
      labelledBy="student-referral-title"
      className="bg-slate-900/35"
      panelClassName="max-w-2xl"
      contentClassName="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10"
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10 flex flex-col max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50/40 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Referral</p>
            <h2 id="student-referral-title" className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              Refer a Student
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a student and indicate the reasons for referral to AMU staff.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-transparent p-2 text-slate-400 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-700"
            aria-label="Close referral modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6">
          {/* Student Selection */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Select Student
            </label>

            {selectedStudentData ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {selectedStudentData.student_name}
                      </p>
                      <p className="text-sm text-slate-600 font-mono">
                        ID: {selectedStudentData.student_id || 'N/A'}
                      </p>
                      {selectedStudentData.student_email && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {selectedStudentData.student_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent('')
                    setSearchInput('')
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Change student
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name or student ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      <div className="py-1">
                        {filteredStudents.map((student) => {
                          const identifier = student.student_email || student.student_id
                          return (
                            <button
                              key={identifier}
                              type="button"
                              onClick={() => handleSelectStudent(student)}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-slate-900 truncate">
                                    {student.student_name}
                                  </p>
                                  <p className="text-xs text-slate-500 font-mono">
                                    {student.student_id || 'No ID'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">
                        No students found matching "{searchInput}"
                      </div>
                    )}
                  </div>
                )}

                {students.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    No students available in this class.
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              {selectedStudentData ? 'Click "Change student" to select a different student.' : 'Type to search by name or student ID.'}
            </p>
          </div>

          {/* AMU Staff Selection */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Assign to AMU Staff
            </label>
            
            {filteredAmuStaff.length > 0 ? (
              <div>
                <select
                  value={selectedAmuStaff}
                  onChange={(e) => setSelectedAmuStaff(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100"
                >
                  <option value="">Select an AMU staff member...</option>
                  {filteredAmuStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  AMU staff members from {instructorCollege} college.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900 font-medium">
                  ⚠️ No AMU staff available
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  There are no active AMU staff members assigned to {instructorCollege} college yet.
                </p>
              </div>
            )}
          </div>

          {/* Referral Reasons */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Reasons for Referral
            </p>
            <p className="text-xs text-slate-600 mb-4">
              Select all reasons that apply to this student:
            </p>

            <div className="space-y-3">
              {REFERRAL_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-emerald-50/40 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons[reason.id]}
                    onChange={() => handleReasonChange(reason.id)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-60"
                  />
                  <span className="text-sm text-slate-700 font-medium">{reason.label}</span>
                </label>
              ))}
            </div>

            {Object.values(selectedReasons).every((v) => !v) && (
              <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ Please select at least one reason for referral.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting
              || !selectedStudent
              || !selectedAmuStaff
              || Object.values(selectedReasons).every((v) => !v)
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Users className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Referral'}
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>

          <p className="text-xs text-slate-500 ml-auto">
            {selectedStudent && selectedAmuStaff && Object.values(selectedReasons).some((v) => v)
              ? 'Ready to submit referral.'
              : 'Select a student, AMU staff, and at least one reason.'}
          </p>
        </div>
      </div>
    </HeaderAwareOverlay>
  )
}

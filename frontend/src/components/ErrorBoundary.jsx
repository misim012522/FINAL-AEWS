import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4">
              The page could not be displayed. Check the browser console for details.
            </p>
            <pre className="text-xs text-red-700 bg-red-50 p-3 rounded-lg overflow-auto max-h-32 mb-4">
              {this.state.error?.message ?? 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="w-full py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to login
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-surface rounded-xl">
            <h2 className="text-2xl font-bold text-red-500 mb-4">出錯了！</h2>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              重新載入
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 
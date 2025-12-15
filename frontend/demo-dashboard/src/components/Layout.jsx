import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Home, BarChart3, Settings, Package, Truck } from 'lucide-react'
import { discussionAPI } from '../services/api'

export default function Layout({ children }) {
  const location = useLocation()
  const [loadingEngineering, setLoadingEngineering] = useState(false)
  const [loadingSCM, setLoadingSCM] = useState(false)

  const handleRetrieveEngineering = async () => {
    try {
      setLoadingEngineering(true)
      const result = await discussionAPI.retrieveEngineeringDiscussions()
      const message = result.message || 'Engineering discussions retrieved successfully'
      alert(`Success: ${message}`)
    } catch (error) {
      console.error('Error retrieving engineering discussions:', error)
      const errorMessage = error.message || 'Failed to retrieve engineering discussions'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoadingEngineering(false)
    }
  }

  const handleRetrieveSCM = async () => {
    try {
      setLoadingSCM(true)
      const result = await discussionAPI.retrieveSCMDiscussions()
      const message = result.message || 'SCM discussions retrieved successfully'
      alert(`Success: ${message}`)
    } catch (error) {
      console.error('Error retrieving SCM discussions:', error)
      const errorMessage = error.message || 'Failed to retrieve SCM discussions'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoadingSCM(false)
    }
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/components', label: 'Components', icon: Package },
    { path: '/suppliers', label: 'Suppliers', icon: Truck },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleRetrieveEngineering}
              disabled={loadingEngineering}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loadingEngineering ? 'Loading...' : 'Retrieve Engineering'}
            </button>
            <button
              onClick={handleRetrieveSCM}
              disabled={loadingSCM}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              {loadingSCM ? 'Loading...' : 'Retrieve SCM'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}



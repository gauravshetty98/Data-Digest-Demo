import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { machineDetailsAPI } from '../services/api'
import ComponentCard from './ComponentCard'

export default function ComponentsPage() {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchComponents()
  }, [])

  const fetchComponents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await machineDetailsAPI.getAllMachineDetails()
      
      if (response.success && response.data) {
        setComponents(response.data)
      } else {
        setError('Failed to load components')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch components')
      console.error('Error fetching components:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredComponents = components.filter(component => {
    const searchLower = searchTerm.toLowerCase()
    const name = (component.name || '').toLowerCase()
    const item = (component.item || '').toLowerCase()
    const category = (component.category || '').toLowerCase()
    return name.includes(searchLower) || item.includes(searchLower) || category.includes(searchLower)
  })

  const handleCardClick = (itemId) => {
    navigate(`/components/${encodeURIComponent(itemId)}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Components</h1>
        <button
          onClick={fetchComponents}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, item ID, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading components...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchComponents}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredComponents.length} of {components.length} components
          </div>

          {filteredComponents.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No components found matching your search.' : 'No components found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredComponents.map((component) => (
                <ComponentCard
                  key={component.item}
                  component={component}
                  onClick={() => handleCardClick(component.item)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}


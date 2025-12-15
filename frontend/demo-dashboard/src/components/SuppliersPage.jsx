import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supplierAPI } from '../services/api'
import SupplierCard from './SupplierCard'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await supplierAPI.getAllSuppliers({ limit: 1000 })
      
      if (response.success && response.data) {
        setSuppliers(response.data)
      } else {
        setError('Failed to load suppliers')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers')
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const searchLower = searchTerm.toLowerCase()
    const name = (supplier.supplier_name || '').toLowerCase()
    const type = (supplier.supplier_type || '').toLowerCase()
    const country = (supplier.hq_country || '').toLowerCase()
    const status = (supplier.status || '').toLowerCase()
    return name.includes(searchLower) || type.includes(searchLower) || country.includes(searchLower) || status.includes(searchLower)
  })

  const handleCardClick = (supplierId) => {
    navigate(`/suppliers/${encodeURIComponent(supplierId)}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
        <button
          onClick={fetchSuppliers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, type, country, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading suppliers...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchSuppliers}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.supplier_id}
                  supplier={supplier}
                  onClick={() => handleCardClick(supplier.supplier_id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

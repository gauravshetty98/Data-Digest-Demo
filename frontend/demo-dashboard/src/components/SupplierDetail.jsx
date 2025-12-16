import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supplierAPI, discussionAPI } from '../services/api'
import DiscussionCard from './DiscussionCard'

export default function SupplierDetail() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [components, setComponents] = useState([])
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingComponents, setLoadingComponents] = useState(false)
  const [loadingDiscussions, setLoadingDiscussions] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (supplierId) {
      fetchSupplierDetails()
      fetchSupplierComponents()
      fetchSupplierDiscussions()
    }
  }, [supplierId])

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const decodedSupplierId = decodeURIComponent(supplierId)
      const response = await supplierAPI.getSupplierById(decodedSupplierId)

      if (response.success && response.data && response.data.length > 0) {
        setSupplier(response.data[0])
      } else {
        setError('Supplier not found')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch supplier details')
      console.error('Error fetching supplier details:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSupplierComponents = async () => {
    try {
      setLoadingComponents(true)
      const decodedSupplierId = decodeURIComponent(supplierId)
      const response = await supplierAPI.getSupplierComponents(decodedSupplierId)
      
      if (response.success && response.data) {
        setComponents(response.data)
      }
    } catch (err) {
      console.error('Error fetching supplier components:', err)
      setComponents([])
    } finally {
      setLoadingComponents(false)
    }
  }

  const fetchSupplierDiscussions = async () => {
    try {
      setLoadingDiscussions(true)
      const decodedSupplierId = decodeURIComponent(supplierId)
      
      // Fetch all discussions and filter by supplier_id
      const response = await discussionAPI.getAllDiscussions()
      
      if (response.success && response.data) {
        // Filter discussions that match this supplier_id
        const filteredDiscussions = response.data.filter(discussion => {
          const discussionSupplierId = discussion['supplier_id'] || discussion.supplier_id
          return discussionSupplierId && discussionSupplierId.toString().trim() === decodedSupplierId.toString().trim()
        })
        setDiscussions(filteredDiscussions)
      } else {
        setDiscussions([])
      }
    } catch (err) {
      console.error('Error fetching supplier discussions:', err)
      setDiscussions([])
    } finally {
      setLoadingDiscussions(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading supplier details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchSupplierDetails}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Supplier not found.</p>
        <button
          onClick={() => navigate('/suppliers')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Suppliers
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{supplier.supplier_name || 'Unnamed Supplier'}</h1>
      </div>

      {/* Supplier Details */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {supplier.supplier_type && (
            <div>
              <span className="text-sm font-medium text-gray-500">Type:</span>
              <p className="text-gray-900">{supplier.supplier_type}</p>
            </div>
          )}
          {supplier.hq_country && (
            <div>
              <span className="text-sm font-medium text-gray-500">HQ Country:</span>
              <p className="text-gray-900">{supplier.hq_country}</p>
            </div>
          )}
          {supplier.hq_region && (
            <div>
              <span className="text-sm font-medium text-gray-500">HQ Region:</span>
              <p className="text-gray-900">{supplier.hq_region}</p>
            </div>
          )}
          {supplier.status && (
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <p className={`${
                supplier.status === 'Active' ? 'text-green-600' : 
                supplier.status === 'Inactive' ? 'text-gray-600' : 
                'text-red-600'
              }`}>
                {supplier.status}
              </p>
            </div>
          )}
          {supplier.risk_rating && (
            <div>
              <span className="text-sm font-medium text-gray-500">Risk Rating:</span>
              <p className="text-gray-900">{supplier.risk_rating}</p>
            </div>
          )}
          {supplier.preferred_supplier_flag !== undefined && (
            <div>
              <span className="text-sm font-medium text-gray-500">Preferred Supplier:</span>
              <p className="text-gray-900">{supplier.preferred_supplier_flag === 1 ? 'Yes' : 'No'}</p>
            </div>
          )}
          {supplier.payment_terms_default && (
            <div>
              <span className="text-sm font-medium text-gray-500">Payment Terms:</span>
              <p className="text-gray-900">{supplier.payment_terms_default}</p>
            </div>
          )}
          {supplier.currency_default && (
            <div>
              <span className="text-sm font-medium text-gray-500">Default Currency:</span>
              <p className="text-gray-900">{supplier.currency_default}</p>
            </div>
          )}
        </div>

        {/* Contact Information */}
        {(supplier.primary_contact_name || supplier.primary_contact_email || supplier.primary_contact_phone) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {supplier.primary_contact_name && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Contact Name:</span>
                  <p className="text-gray-900">{supplier.primary_contact_name}</p>
                </div>
              )}
              {supplier.primary_contact_email && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Email:</span>
                  <p className="text-gray-900">
                    <a href={`mailto:${supplier.primary_contact_email}`} className="text-blue-600 hover:underline">
                      {supplier.primary_contact_email}
                    </a>
                  </p>
                </div>
              )}
              {supplier.primary_contact_phone && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Phone:</span>
                  <p className="text-gray-900">
                    <a href={`tel:${supplier.primary_contact_phone}`} className="text-blue-600 hover:underline">
                      {supplier.primary_contact_phone}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certifications */}
        {supplier.certifications && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-500">Certifications:</span>
            <p className="text-gray-900 mt-1">{supplier.certifications}</p>
          </div>
        )}
      </div>

      {/* Supplier Components */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplied Components</h2>
        
        {loadingComponents ? (
          <div className="text-gray-500">Loading components...</div>
        ) : components.length === 0 ? (
          <div className="text-gray-500">No components found for this supplier.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MOQ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Agreement Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OTD %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {components.map((component, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {component.component_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.moq || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.price_agreement_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.quality_rating || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.otd_percent !== null && component.otd_percent !== undefined 
                        ? `${component.otd_percent}%` 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        component.contract_status === 'Active Contract' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {component.contract_status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {component.unit_cost_estimate 
                        ? `${component.currency || ''} ${component.unit_cost_estimate}` 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {component.lead_time_days ? `${component.lead_time_days} days` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Discussions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Issues & Updates</h2>
        
        {loadingDiscussions ? (
          <div className="text-gray-500">Loading discussions...</div>
        ) : discussions.length === 0 ? (
          <div className="text-gray-500">No discussions found for this supplier.</div>
        ) : (
          <div className="space-y-4">
            {discussions.map((discussion, index) => (
              <DiscussionCard
                key={discussion.id || discussion.discussion_id || index}
                discussion={discussion}
                onClick={(componentId) => navigate(`/components/${encodeURIComponent(componentId)}`)}
                onUpdate={fetchSupplierDiscussions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

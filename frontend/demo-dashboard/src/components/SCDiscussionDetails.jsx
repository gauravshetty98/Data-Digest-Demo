import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { discussionAPI, machineDetailsAPI, supplierAPI } from '../services/api'

export default function SCDiscussionDetails() {
  const { discussionId } = useParams()
  const navigate = useNavigate()
  const [discussion, setDiscussion] = useState(null)
  const [component, setComponent] = useState(null)
  const [supplier, setSupplier] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [otherSupplierDiscussions, setOtherSupplierDiscussions] = useState([])
  const [impactData, setImpactData] = useState(null)
  const [otherUsagesHierarchies, setOtherUsagesHierarchies] = useState({})
  const [expandedUsages, setExpandedUsages] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingComponent, setLoadingComponent] = useState(false)
  const [loadingSupplier, setLoadingSupplier] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingOtherSupplierDiscussions, setLoadingOtherSupplierDiscussions] = useState(false)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (discussionId) {
      fetchDiscussion()
    }
  }, [discussionId])

  useEffect(() => {
    if (discussion) {
      const componentId = discussion['Component ID'] || discussion.component_id || discussion.item_id
      const supplierId = discussion['supplier_id'] || discussion.supplier_id
      
      if (componentId) {
        fetchComponentDetails(componentId)
        fetchComponentImpact(componentId)
      }
      
      if (supplierId && supplierId.toString().trim() !== '') {
        fetchSupplierDetails(supplierId)
        fetchOtherSupplierDiscussions(supplierId)
      }
    }
  }, [discussion])

  useEffect(() => {
    if (component && component.child_identifier) {
      fetchComponentSuppliers(component.child_identifier)
    }
  }, [component])

  const fetchDiscussion = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all discussions and find the one with matching ID
      const response = await discussionAPI.getAllDiscussions()
      
      if (response.success && response.data) {
        const foundDiscussion = response.data.find(d => {
          const id = d.id || d.discussion_id || d.ID
          return id && id.toString() === discussionId
        })
        
        if (foundDiscussion) {
          setDiscussion(foundDiscussion)
        } else {
          setError('Discussion not found')
        }
      } else {
        setError('Failed to fetch discussion')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch discussion details')
      console.error('Error fetching discussion:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSupplierDetails = async (supplierId) => {
    try {
      setLoadingSupplier(true)
      const decodedSupplierId = decodeURIComponent(supplierId.toString())
      const response = await supplierAPI.getSupplierById(decodedSupplierId)
      
      if (response.success && response.data && response.data.length > 0) {
        setSupplier(response.data[0])
      }
    } catch (err) {
      console.error('Error fetching supplier details:', err)
    } finally {
      setLoadingSupplier(false)
    }
  }

  const fetchComponentDetails = async (componentId) => {
    try {
      setLoadingComponent(true)
      const decodedComponentId = decodeURIComponent(componentId)
      const response = await machineDetailsAPI.getComponentById(decodedComponentId)
      
      if (response.success && response.data && response.data.length > 0) {
        setComponent(response.data[0])
      }
    } catch (err) {
      console.error('Error fetching component details:', err)
    } finally {
      setLoadingComponent(false)
    }
  }

  const fetchComponentSuppliers = async (childIdentifier) => {
    try {
      setLoadingSuppliers(true)
      const response = await supplierAPI.getComponentSuppliers(childIdentifier)
      if (response.success && response.data) {
        setSuppliers(response.data)
      } else {
        setSuppliers([])
      }
    } catch (err) {
      console.error('Error fetching component suppliers:', err)
      setSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const fetchOtherSupplierDiscussions = async (supplierId) => {
    try {
      setLoadingOtherSupplierDiscussions(true)
      
      // Fetch all discussions and filter by supplier_id
      const response = await discussionAPI.getAllDiscussions()
      
      if (response.success && response.data) {
        // Filter discussions that match this supplier_id and exclude the current discussion
        const filteredDiscussions = response.data.filter(d => {
          const id = d.id || d.discussion_id || d.ID
          const discussionSupplierId = d['supplier_id'] || d.supplier_id
          const matchesSupplier = discussionSupplierId && discussionSupplierId.toString().trim() === supplierId.toString().trim()
          const isNotCurrent = id && id.toString() !== discussionId
          return matchesSupplier && isNotCurrent
        })
        setOtherSupplierDiscussions(filteredDiscussions)
      } else {
        setOtherSupplierDiscussions([])
      }
    } catch (err) {
      console.error('Error fetching other supplier discussions:', err)
      setOtherSupplierDiscussions([])
    } finally {
      setLoadingOtherSupplierDiscussions(false)
    }
  }

  const fetchComponentImpact = async (componentId) => {
    try {
      setLoadingImpact(true)
      const decodedComponentId = decodeURIComponent(componentId)
      const impactRes = await machineDetailsAPI.getComponentImpact(decodedComponentId, true, true)
      if (impactRes.success && impactRes.data && impactRes.data.length > 0) {
        setImpactData(impactRes.data[0])
      }
    } catch (err) {
      console.error('Error fetching component impact:', err)
    } finally {
      setLoadingImpact(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No date available'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading discussion details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchDiscussion}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Discussion not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Activity Feed
        </button>
      </div>
    )
  }

  const componentId = discussion['Component ID'] || discussion.component_id || discussion.item_id
  const summary = discussion.Summary || discussion.summary || 'No summary available'
  const latestUpdate = discussion['Latest Update'] || discussion.latest_update || 'No update available'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Supply Chain Discussion</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            #Supply Chain
          </span>
          {discussion.created_at && (
            <span className="text-sm text-gray-500">
              {formatDate(discussion.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* Discussion Summary */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Discussion Summary</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </p>
      </div>

      {/* Latest Update */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Update</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {latestUpdate}
        </p>
      </div>

      {/* Supplier Details */}
      {loadingSupplier ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Details</h2>
          <div className="text-gray-500">Loading supplier details...</div>
        </div>
      ) : supplier && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Supplier Details</h2>
            <button
              onClick={() => {
                const supplierId = supplier.supplier_id
                if (supplierId) {
                  navigate(`/suppliers/${encodeURIComponent(supplierId)}`)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              View Full Supplier Details
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{supplier.supplier_name || 'Unnamed Supplier'}</h3>
            </div>
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
            </div>
            {(supplier.primary_contact_name || supplier.primary_contact_email || supplier.primary_contact_phone) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Contact Information</h3>
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
          </div>
        </div>
      )}

      {/* Component Details */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Component Details</h2>
          {component && (
            <button
              onClick={() => navigate(`/components/${encodeURIComponent(component.item)}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              View Full Component Details
            </button>
          )}
        </div>
        {loadingComponent ? (
          <div className="text-gray-500">Loading component details...</div>
        ) : component ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{component.name || 'Unnamed Component'}</h3>
              <p className="text-sm text-gray-500 font-mono">Item ID: {component.item}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {component.product && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Product:</span>
                  <p className="text-gray-900">{component.product}</p>
                </div>
              )}
              {component.version && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Version:</span>
                  <p className="text-gray-900">{component.version}</p>
                </div>
              )}
              {component.category && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Category:</span>
                  <p className="text-gray-900">{component.category}</p>
                </div>
              )}
              {component.material && component.material !== 'N/A' && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Material:</span>
                  <p className="text-gray-900">{component.material}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Component not found</div>
        )}
      </div>

      {/* Potential Affected Components */}
      {loadingImpact ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Potential Affected Components</h2>
          <div className="text-gray-500">Loading impact data...</div>
        </div>
      ) : impactData && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Potential Affected Components
          </h2>
          
          <div className="space-y-6">
            {/* Section 1: Directly Affected Components (Parents) */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Directly Affected Components (Parent Hierarchy)
                {impactData.counts && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({impactData.counts.directly_affected || 0})
                  </span>
                )}
              </h3>
              {impactData.directly_affected_components && impactData.directly_affected_components.length > 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="space-y-0.5">
                    {impactData.directly_affected_components.map((comp, index) => {
                      const indentLevel = comp.item ? comp.item.split('.').length - 1 : 0
                      const isLast = index === impactData.directly_affected_components.length - 1
                      return (
                        <div
                          key={index}
                          className="flex items-center"
                          style={{ paddingLeft: `${indentLevel * 1.5}rem` }}
                        >
                          {indentLevel > 0 && (
                            <span className="text-gray-400 mr-2 font-mono">
                              {isLast ? '└─' : '├─'}
                            </span>
                          )}
                          <span className="text-sm text-gray-700">
                            <span className="font-mono font-semibold">{comp.item}</span>
                            {comp.name && (
                              <span className="ml-2 text-gray-600">- {comp.name}</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No directly affected components found.</p>
              )}
            </div>

            {/* Section 2: Other Usages of Same Base Component */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Other Usages of Same Base Component
                {impactData.counts && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({impactData.counts.other_usages || 0})
                  </span>
                )}
              </h3>
              {impactData.other_usages_of_base_component && impactData.other_usages_of_base_component.length > 0 ? (
                <div className="space-y-2">
                  {impactData.other_usages_of_base_component.map((comp, index) => {
                    const itemId = comp.item
                    const hierarchy = otherUsagesHierarchies[itemId] || []
                    const isExpanded = expandedUsages.has(itemId)
                    
                    return (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                      >
                        <button
                          onClick={async () => {
                            const newExpanded = new Set(expandedUsages)
                            if (isExpanded) {
                              newExpanded.delete(itemId)
                              setExpandedUsages(newExpanded)
                            } else {
                              newExpanded.add(itemId)
                              setExpandedUsages(newExpanded)
                              
                              // Fetch hierarchy if not already loaded
                              if (!otherUsagesHierarchies[itemId]) {
                                try {
                                  const decodedItemId = decodeURIComponent(itemId)
                                  const parentsRes = await machineDetailsAPI.getComponentParents(decodedItemId)
                                  if (parentsRes.success && parentsRes.data) {
                                    // Sort by item path
                                    const sorted = [...parentsRes.data].sort((a, b) => {
                                      const aParts = a.item.split('.').map(Number)
                                      const bParts = b.item.split('.').map(Number)
                                      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                                        const aVal = aParts[i] || 0
                                        const bVal = bParts[i] || 0
                                        if (aVal !== bVal) return aVal - bVal
                                      }
                                      return 0
                                    })
                                    setOtherUsagesHierarchies(prev => ({
                                      ...prev,
                                      [itemId]: sorted
                                    }))
                                  }
                                } catch (err) {
                                  console.error(`Error fetching hierarchy for ${itemId}:`, err)
                                }
                              }
                            }
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900">
                              <span className="font-mono">{itemId}</span>
                              {comp.name && (
                                <span className="ml-2 text-gray-600">- {comp.name}</span>
                              )}
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-2 bg-white border-t border-gray-200">
                            {hierarchy.length > 0 ? (
                              <>
                                <p className="text-xs text-gray-500 mb-2 font-medium">Parent Hierarchy:</p>
                                <div className="space-y-0.5">
                                  {hierarchy.map((parent, pIndex) => {
                                    const indentLevel = parent.item ? parent.item.split('.').length - 1 : 0
                                    const isLast = pIndex === hierarchy.length - 1
                                    return (
                                      <div
                                        key={pIndex}
                                        className="flex items-center"
                                        style={{ paddingLeft: `${indentLevel * 1.5}rem` }}
                                      >
                                        {indentLevel > 0 && (
                                          <span className="text-gray-400 mr-2 font-mono">
                                            {isLast ? '└─' : '├─'}
                                          </span>
                                        )}
                                        <span className="text-sm text-gray-700">
                                          <span className="font-mono font-semibold">{parent.item}</span>
                                          {parent.name && (
                                            <span className="ml-2 text-gray-600">- {parent.name}</span>
                                          )}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-500">Loading hierarchy...</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No other usages found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Suppliers */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Other suppliers for this component</h2>
        {loadingSuppliers ? (
          <div className="text-gray-500">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-gray-500">No suppliers found for this component.</div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/suppliers/${encodeURIComponent(supplier.supplier_id)}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{supplier.supplier_name || 'Unnamed Supplier'}</h3>
                    {supplier.contract_status && (
                      <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.contract_status === 'Active Contract' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.contract_status}
                      </span>
                    )}
                  </div>
                  {supplier.unit_cost_estimate && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {supplier.currency || ''} {supplier.unit_cost_estimate}
                      </p>
                      {supplier.lead_time_days && (
                        <p className="text-xs text-gray-500">{supplier.lead_time_days} days lead time</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Discussions Related to this Supplier */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Other discussions related to this supplier</h2>
        {loadingOtherSupplierDiscussions ? (
          <div className="text-gray-500">Loading discussions...</div>
        ) : otherSupplierDiscussions.length === 0 ? (
          <div className="text-gray-500">No other discussions found for this supplier.</div>
        ) : (
          <div className="space-y-4">
            {otherSupplierDiscussions.map((otherDiscussion, index) => {
              const otherDiscussionId = otherDiscussion.id || otherDiscussion.discussion_id || otherDiscussion.ID
              const otherComponentId = otherDiscussion['Component ID'] || otherDiscussion.component_id || otherDiscussion.item_id
              return (
                <div
                  key={otherDiscussionId || index}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/sc-discussion/${otherDiscussionId}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          #Supply Chain
                        </span>
                        {otherDiscussion.created_at && (
                          <span className="text-xs text-gray-500">
                            {formatDate(otherDiscussion.created_at)}
                          </span>
                        )}
                      </div>
                      {otherComponentId && (
                        <p className="text-xs text-gray-500 font-mono mb-1">Component: {otherComponentId}</p>
                      )}
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {otherDiscussion.Summary || otherDiscussion.summary || 'No summary'}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {otherDiscussion['Latest Update'] || otherDiscussion.latest_update || 'No update'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

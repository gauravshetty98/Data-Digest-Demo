import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { machineDetailsAPI, discussionAPI, ecrAPI, supplierAPI } from '../services/api'

export default function ECRReview() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [ecr, setEcr] = useState(null)
  const [component, setComponent] = useState(null)
  const [discussions, setDiscussions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [impactData, setImpactData] = useState(null)
  const [otherUsagesHierarchies, setOtherUsagesHierarchies] = useState({})
  const [expandedUsages, setExpandedUsages] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (documentId) {
      fetchECRData()
    }
  }, [documentId])

  const fetchECRData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all ECRs to find the one with matching document_id
      const ecrsResponse = await ecrAPI.getAllECRs()
      
      if (ecrsResponse.success && ecrsResponse.ecrs) {
        const foundEcr = ecrsResponse.ecrs.find(e => 
          e.document_id === documentId || 
          e.document_id === `ecr_${documentId}.docx` ||
          e.document_id === documentId.replace('.docx', '')
        )
        
        if (!foundEcr) {
          setError('ECR not found')
          setLoading(false)
          return
        }

        setEcr(foundEcr)
        const componentId = foundEcr.component_id

        // Fetch component details
        if (componentId) {
          try {
            const componentRes = await machineDetailsAPI.getComponentById(componentId)
            if (componentRes.success && componentRes.data && componentRes.data.length > 0) {
              const componentData = componentRes.data[0]
              setComponent(componentData)
              
              // If child_identifier exists, fetch suppliers
              if (componentData.child_identifier) {
                try {
                  console.log('Fetching suppliers for child_identifier:', componentData.child_identifier)
                  const suppliersRes = await supplierAPI.getSupplierContractsByChildIdentifier(componentData.child_identifier)
                  console.log('Suppliers response:', suppliersRes)
                  if (suppliersRes.success && suppliersRes.data) {
                    console.log('Setting suppliers:', suppliersRes.data)
                    setSuppliers(suppliersRes.data)
                  } else {
                    console.log('No suppliers data in response:', suppliersRes)
                  }
                } catch (err) {
                  console.error('Error fetching suppliers:', err)
                }
              } else {
                console.log('No child_identifier found in component:', componentData)
              }
            }
          } catch (err) {
            console.error('Error fetching component details:', err)
          }

          // Fetch all discussions for this component
          try {
            const discussionsRes = await discussionAPI.getDiscussionsByItemId(componentId)
            if (discussionsRes.success && discussionsRes.data && discussionsRes.data.length > 0) {
              // Sort by created_at (most recent first)
              const sorted = [...discussionsRes.data].sort((a, b) => {
                const dateA = new Date(a.created_at || 0)
                const dateB = new Date(b.created_at || 0)
                return dateB - dateA
              })
              setDiscussions(sorted)
            }
          } catch (err) {
            console.error('Error fetching discussions:', err)
          }

          // Fetch component impact (affected components)
          try {
            const impactRes = await machineDetailsAPI.getComponentImpact(componentId, true, true)
            if (impactRes.success && impactRes.data && impactRes.data.length > 0) {
              const impact = impactRes.data[0]
              setImpactData(impact)
              
              // Fetch parent hierarchies for other usages (fetch on demand when expanded)
              // We'll fetch them when the user clicks to expand
            }
          } catch (err) {
            console.error('Error fetching component impact:', err)
          }
        }
      } else {
        setError('Failed to load ECR data')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch ECR data')
      console.error('Error fetching ECR data:', err)
    } finally {
      setLoading(false)
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
        <div className="text-gray-500">Loading ECR review...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchECRData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!ecr) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">ECR not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ECR Review</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">Document ID: {ecr.document_id}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          Back to Feed
        </button>
      </div>

      {/* ECR Description */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">ECR Description</h2>
        <p className="text-gray-700 leading-relaxed">
          {ecr.ecr_title || 'No description available'}
        </p>
        {ecr.created_at && (
          <p className="text-sm text-gray-500 mt-4">
            Created: {formatDate(ecr.created_at)}
          </p>
        )}
      </div>

      {/* Component Details */}
      {component ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Component Details</h2>
          <div className="grid grid-cols-2 gap-4">
            {component.name && (
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-gray-900">{component.name}</p>
              </div>
            )}
            {component.item && (
              <div>
                <span className="text-sm font-medium text-gray-500">Item ID:</span>
                <p className="text-gray-900 font-mono">{component.item}</p>
              </div>
            )}
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
            {component.quantity && (
              <div>
                <span className="text-sm font-medium text-gray-500">Quantity:</span>
                <p className="text-gray-900">{component.quantity}</p>
              </div>
            )}
            {component.mass && component.mass !== 'No value' && (
              <div>
                <span className="text-sm font-medium text-gray-500">Mass:</span>
                <p className="text-gray-900">{component.mass}</p>
              </div>
            )}
          </div>
          {component.notes && component.notes !== 'N/A' && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <p className="text-gray-900 mt-1">{component.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Component Details</h2>
          <p className="text-gray-500">Component ID: {ecr.component_id}</p>
          <p className="text-gray-500 mt-2">Component details not available.</p>
        </div>
      )}

      {/* Potential Affected Components */}
      {impactData && (
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
                                  const parentsRes = await machineDetailsAPI.getComponentParents(itemId)
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
                                  {/* Show the component itself at the end */}
                                  <div
                                    className="flex items-center"
                                    style={{ paddingLeft: `${(itemId.split('.').length - 1) * 1.5}rem` }}
                                  >
                                    <span className="text-gray-400 mr-2 font-mono">└─</span>
                                    <span className="text-sm text-gray-700">
                                      <span className="font-mono font-semibold">{itemId}</span>
                                      {comp.name && (
                                        <span className="ml-2 text-gray-600">- {comp.name}</span>
                                      )}
                                    </span>
                                  </div>
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
                <p className="text-gray-500 text-sm">
                  {impactData.base_child_identifier 
                    ? 'No other usages found for this base component.' 
                    : 'No child_identifier available to find other usages.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discussions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Discussions ({discussions.length})
        </h2>
        {discussions.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {discussions.map((discussion, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
              >
                {/* Summary */}
                {(discussion.Summary || discussion.summary) && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Summary:</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {discussion.Summary || discussion.summary}
                    </p>
                  </div>
                )}
                
                {/* Latest Update */}
                {(discussion['Latest Update'] || discussion.latest_update) && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Latest Update:</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {discussion['Latest Update'] || discussion.latest_update}
                    </p>
                  </div>
                )}
                
                {/* Date */}
                {discussion.created_at && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {formatDate(discussion.created_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No discussions found for this component.</p>
        )}
      </div>

      {/* Suppliers */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Available Suppliers ({suppliers.length})
        </h2>
        {suppliers.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {suppliers.map((supplier, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {supplier.supplier_name || 'Unknown Supplier'}
                    </h3>
                    {supplier.supplier_type && (
                      <p className="text-sm text-gray-600">{supplier.supplier_type}</p>
                    )}
                  </div>
                  {supplier.preferred_for_component_flag === 1 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      Preferred
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {supplier.contract_status && (
                    <div>
                      <span className="text-gray-500">Contract Status:</span>
                      <span className={`ml-2 ${
                        supplier.contract_status === 'Active Contract' 
                          ? 'text-green-600 font-medium' 
                          : 'text-gray-600'
                      }`}>
                        {supplier.contract_status}
                      </span>
                    </div>
                  )}
                  {supplier.unit_cost_estimate && (
                    <div>
                      <span className="text-gray-500">Unit Cost:</span>
                      <span className="ml-2 text-gray-900">
                        {supplier.currency || ''} {supplier.unit_cost_estimate}
                      </span>
                    </div>
                  )}
                  {supplier.lead_time_days && (
                    <div>
                      <span className="text-gray-500">Lead Time:</span>
                      <span className="ml-2 text-gray-900">{supplier.lead_time_days} days</span>
                    </div>
                  )}
                  {supplier.moq && (
                    <div>
                      <span className="text-gray-500">MOQ:</span>
                      <span className="ml-2 text-gray-900">{supplier.moq}</span>
                    </div>
                  )}
                  {supplier.ship_from_country && (
                    <div>
                      <span className="text-gray-500">Ship From:</span>
                      <span className="ml-2 text-gray-900">{supplier.ship_from_country}</span>
                    </div>
                  )}
                  {supplier.quality_rating && (
                    <div>
                      <span className="text-gray-500">Quality Rating:</span>
                      <span className="ml-2 text-gray-900">{supplier.quality_rating}</span>
                    </div>
                  )}
                </div>

                {supplier.payment_terms && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Payment Terms:</span>
                    <span className="ml-2 text-sm text-gray-900">{supplier.payment_terms}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            {component?.child_identifier 
              ? 'No suppliers found for this component.' 
              : 'No child_identifier available for this component.'}
          </p>
        )}
      </div>

    </div>
  )
}

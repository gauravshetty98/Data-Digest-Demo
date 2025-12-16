import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, Loader2, Download } from 'lucide-react'
import { ecrAPI, machineDetailsAPI, supplierAPI, discussionAPI } from '../services/api'

export default function ECRDiscussionDetails() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [ecr, setEcr] = useState(null)
  const [component, setComponent] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [relatedDiscussions, setRelatedDiscussions] = useState([])
  const [impactData, setImpactData] = useState(null)
  const [otherUsagesHierarchies, setOtherUsagesHierarchies] = useState({})
  const [expandedUsages, setExpandedUsages] = useState(new Set())
  const [suppliersExpanded, setSuppliersExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingComponent, setLoadingComponent] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingRelatedDiscussions, setLoadingRelatedDiscussions] = useState(false)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (documentId) {
      fetchECRData()
    }
  }, [documentId])

  useEffect(() => {
    if (ecr && ecr.component_id) {
      fetchComponentDetails(ecr.component_id)
      fetchComponentImpact(ecr.component_id)
      fetchRelatedDiscussions(ecr.component_id, ecr.created_at)
    }
  }, [ecr])

  useEffect(() => {
    if (component && component.child_identifier) {
      fetchComponentSuppliers(component.child_identifier)
    }
  }, [component])

  const fetchECRData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all ECRs to find the one with matching document_id
      const ecrsResponse = await ecrAPI.getAllECRs()
      
      if (ecrsResponse.success && ecrsResponse.ecrs) {
        // Try different document_id formats
        const foundEcr = ecrsResponse.ecrs.find(e => 
          e.document_id === documentId || 
          e.document_id === `ecr_${documentId}.docx` ||
          e.document_id === documentId.replace('.docx', '') ||
          (e.document_id && e.document_id.replace('ecr_', '').replace('.docx', '') === documentId)
        )
        
        if (foundEcr) {
          setEcr(foundEcr)
        } else {
          setError('ECR not found')
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

  const fetchRelatedDiscussions = async (componentId, ecrCreatedAt) => {
    try {
      setLoadingRelatedDiscussions(true)
      const decodedComponentId = decodeURIComponent(componentId)
      const response = await discussionAPI.getDiscussionsByItemId(decodedComponentId)
      
      if (response.success && response.data) {
        // Filter discussions created before the ECR created_at time
        const filtered = response.data.filter(d => {
          if (!ecrCreatedAt) return true
          const discussionCreatedAt = d.created_at
          if (!discussionCreatedAt) return false
          return new Date(discussionCreatedAt) < new Date(ecrCreatedAt)
        })
        
        // Sort by created_at (most recent first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateB - dateA
        })
        
        setRelatedDiscussions(filtered)
      } else {
        setRelatedDiscussions([])
      }
    } catch (err) {
      console.error('Error fetching related discussions:', err)
      setRelatedDiscussions([])
    } finally {
      setLoadingRelatedDiscussions(false)
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

  const handleDownload = async () => {
    try {
      setDownloading(true)
      // Clean document ID - remove ecr_ prefix and .docx extension if present
      const cleanDocumentId = documentId.replace('ecr_', '').replace('.docx', '')
      await ecrAPI.downloadECRDocument(cleanDocumentId)
    } catch (err) {
      console.error('Error downloading ECR:', err)
      alert('Failed to download ECR document')
    } finally {
      setDownloading(false)
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
        <div className="text-gray-500">Loading ECR details...</div>
      </div>
    )
  }

  if (error && !ecr) {
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
          Back to Activity Feed
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ECR Draft Details</h1>
          {ecr.created_at && (
            <p className="text-sm text-gray-500 mt-1">Created: {formatDate(ecr.created_at)}</p>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Draft ECR
            </>
          )}
        </button>
      </div>

      {/* Issue Description */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Description</h2>
        <p className="text-gray-700 leading-relaxed">
          {ecr.ecr_title || 'No description available'}
        </p>
      </div>

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
          <div className="text-gray-500">Component not found. Component ID: {ecr.component_id}</div>
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

      {/* Available Suppliers */}
      {component && component.child_identifier && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Dropdown Header */}
          <button
            onClick={() => setSuppliersExpanded(!suppliersExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Available Suppliers {suppliers.length > 0 && `(${suppliers.length})`}
            </h2>
            {suppliersExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Dropdown Content */}
          {suppliersExpanded && (
            <div className="px-6 pb-6 border-t border-gray-200">
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                  <span className="text-gray-500">Loading suppliers...</span>
                </div>
              ) : suppliers.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {suppliers.map((supplier, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {supplier.supplier_name || 'Unknown Supplier'}
                          </h3>
                          {supplier.supplier_type && (
                            <p className="text-sm text-gray-500">{supplier.supplier_type}</p>
                          )}
                        </div>
                        {supplier.preferred_for_component_flag && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                            Preferred
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {supplier.contract_status && (
                          <div>
                            <span className="text-gray-500">Contract Status:</span>
                            <span className={`ml-2 font-medium ${
                              supplier.contract_status === 'Active Contract' 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {supplier.contract_status}
                            </span>
                          </div>
                        )}
                        {supplier.unit_cost_estimate && (
                          <div>
                            <span className="text-gray-500">Unit Cost:</span>
                            <span className="ml-2 text-gray-900">
                              {supplier.currency || '$'}{supplier.unit_cost_estimate}
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
                      </div>

                      {supplier.supplier_id && (
                        <button
                          onClick={() => navigate(`/suppliers/${encodeURIComponent(supplier.supplier_id)}`)}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Supplier Details →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-4">No suppliers available for this component.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Related Discussions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Related discussions</h2>
        {loadingRelatedDiscussions ? (
          <div className="text-gray-500">Loading discussions...</div>
        ) : relatedDiscussions.length === 0 ? (
          <div className="text-gray-500">No related discussions found for this component.</div>
        ) : (
          <div className="space-y-4">
            {relatedDiscussions.map((discussion, index) => {
              const discussionId = discussion.id || discussion.discussion_id || discussion.ID
              const supplierId = discussion['supplier_id'] || discussion.supplier_id
              const hasSupplierId = supplierId && supplierId.toString().trim() !== ''
              
              return (
                <div
                  key={discussionId || index}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (hasSupplierId) {
                      navigate(`/sc-discussion/${discussionId}`)
                    } else {
                      navigate(`/dt-discussion/${discussionId}`)
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          hasSupplierId 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {hasSupplierId ? '#Supply Chain' : '#Design & Technical'}
                        </span>
                        {discussion.created_at && (
                          <span className="text-xs text-gray-500">
                            {formatDate(discussion.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {discussion.Summary || discussion.summary || 'No summary'}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {discussion['Latest Update'] || discussion.latest_update || 'No update'}
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

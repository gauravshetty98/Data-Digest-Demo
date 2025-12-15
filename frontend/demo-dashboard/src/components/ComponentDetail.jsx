import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, X, Loader2 } from 'lucide-react'
import { machineDetailsAPI, discussionAPI, ecrAPI, supplierAPI } from '../services/api'

export default function ComponentDetail() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const [component, setComponent] = useState(null)
  const [discussions, setDiscussions] = useState([])
  const [impactData, setImpactData] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [suppliersExpanded, setSuppliersExpanded] = useState(false)
  const [otherUsagesHierarchies, setOtherUsagesHierarchies] = useState({})
  const [expandedUsages, setExpandedUsages] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingDiscussions, setLoadingDiscussions] = useState(false)
  const [error, setError] = useState(null)
  const [showECRDialog, setShowECRDialog] = useState(false)
  const [selectedDiscussions, setSelectedDiscussions] = useState(new Set())
  const [ecrDialogStep, setEcrDialogStep] = useState(1) // 1 = select discussions, 2 = add details
  const [ecrAdditionalDetails, setEcrAdditionalDetails] = useState('')
  const [creatingECR, setCreatingECR] = useState(false)
  const [ecrDocumentId, setEcrDocumentId] = useState(null)
  const [documentDownloaded, setDocumentDownloaded] = useState(false)

  useEffect(() => {
    if (itemId) {
      fetchComponentDetails()
      fetchDiscussions()
      fetchComponentImpact()
    }
  }, [itemId])

  useEffect(() => {
    // Fetch suppliers when component is loaded and has child_identifier
    if (component && component.child_identifier) {
      fetchComponentSuppliers(component.child_identifier)
    }
  }, [component])

  const fetchComponentDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const decodedItemId = decodeURIComponent(itemId)

      // Only fetch component details - no children or other complex data
      const componentRes = await machineDetailsAPI.getComponentById(decodedItemId)

      if (componentRes.success && componentRes.data && componentRes.data.length > 0) {
        setComponent(componentRes.data[0])
      } else {
        setError('Component not found')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch component details')
      console.error('Error fetching component details:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDiscussions = async () => {
    try {
      setLoadingDiscussions(true)
      const decodedItemId = decodeURIComponent(itemId)
      const response = await discussionAPI.getDiscussionsByItemId(decodedItemId)
      
      if (response.success && response.data) {
        setDiscussions(response.data)
      }
    } catch (err) {
      console.error('Error fetching discussions:', err)
      // Don't set error state for discussions, just log it
      setDiscussions([])
    } finally {
      setLoadingDiscussions(false)
    }
  }

  const fetchComponentImpact = async () => {
    try {
      const decodedItemId = decodeURIComponent(itemId)
      const impactRes = await machineDetailsAPI.getComponentImpact(decodedItemId, true, true)
      if (impactRes.success && impactRes.data && impactRes.data.length > 0) {
        setImpactData(impactRes.data[0])
      }
    } catch (err) {
      console.error('Error fetching component impact:', err)
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

  const handleECRButtonClick = () => {
    setShowECRDialog(true)
    setEcrDialogStep(1)
    // Initialize all discussions as selected by default
    setSelectedDiscussions(new Set(discussions.map((_, index) => index)))
    setEcrAdditionalDetails('')
    setDocumentDownloaded(false)
  }

  const handleDialogClose = () => {
    // Allow closing even during/after ECR creation since user can close after download
    setShowECRDialog(false)
    setSelectedDiscussions(new Set())
    setEcrDialogStep(1)
    setEcrAdditionalDetails('')
    setCreatingECR(false)
    setEcrDocumentId(null)
    setDocumentDownloaded(false)
  }

  const handleDiscussionToggle = (index) => {
    const newSelected = new Set(selectedDiscussions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedDiscussions(newSelected)
  }

  const handleNext = async () => {
    if (ecrDialogStep === 1) {
      // Move to step 2
      setEcrDialogStep(2)
    } else {
      // Create ECR
      await handleCreateECR()
    }
  }

  const handleCreateECR = async () => {
    try {
      setCreatingECR(true)
      setEcrDocumentId(null)
      setError(null)

      // Get the discussion IDs from selected indices
      const selectedDiscussionIds = Array.from(selectedDiscussions).map(index => {
        const discussion = discussions[index]
        return discussion.id || discussion.ID || index + 1 // Fallback to index + 1 if no ID field
      })

      // Call the API to create ECR
      const response = await ecrAPI.createECR(selectedDiscussionIds, ecrAdditionalDetails)

      if (response && response.document_id) {
        setEcrDocumentId(response.document_id)
        // Keep dialog open to allow download, user can close manually
        // setTimeout removed - let user decide when to close after downloading
      } else {
        throw new Error('ECR created but no document_id returned')
      }
    } catch (err) {
      console.error('Error creating ECR:', err)
      setError(err.message || 'Failed to create ECR')
      setCreatingECR(false)
    }
  }

  const handleBack = () => {
    setEcrDialogStep(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading component details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchComponentDetails}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!component) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Component not found.</p>
        <button
          onClick={() => navigate('/components')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Components
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{component.name || 'Unnamed Component'}</h1>
        <p className="text-sm text-gray-500 font-mono mt-1">Item ID: {component.item}</p>
      </div>

      {/* Component Details */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Component Details</h2>
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
          {component.quantity && (
            <div>
              <span className="text-sm font-medium text-gray-500">Quantity:</span>
              <p className="text-gray-900">{component.quantity}</p>
            </div>
          )}
          {component.material && component.material !== 'N/A' && (
            <div>
              <span className="text-sm font-medium text-gray-500">Material:</span>
              <p className="text-gray-900">{component.material}</p>
            </div>
          )}
          {component.mass && component.mass !== 'No value' && (
            <div>
              <span className="text-sm font-medium text-gray-500">Mass:</span>
              <p className="text-gray-900">{component.mass}</p>
            </div>
          )}
          {component.length && component.length !== 'N/A' && (
            <div>
              <span className="text-sm font-medium text-gray-500">Length:</span>
              <p className="text-gray-900">{component.length}</p>
            </div>
          )}
          {component.finish && component.finish !== 'N/A' && (
            <div>
              <span className="text-sm font-medium text-gray-500">Finish:</span>
              <p className="text-gray-900">{component.finish}</p>
            </div>
          )}
          {component.internal_part_name && (
            <div>
              <span className="text-sm font-medium text-gray-500">Internal Part Name:</span>
              <p className="text-gray-900">{component.internal_part_name}</p>
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

      {/* ECR Button */}
      <button 
        onClick={handleECRButtonClick}
        className="w-full px-6 py-3 rounded-lg transition-colors font-medium shadow-md flex items-center justify-between" 
        style={{ backgroundColor: '#FF9B71' }}
      >
        <span className="text-left">Want a create an ECR for this component based on recent discussions?</span>
        <ChevronRight className="w-5 h-5 flex-shrink-0" />
      </button>

      {/* Available Suppliers - Collapsible Dropdown */}
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
                        {supplier.hq_country && (
                          <div>
                            <span className="text-gray-500">HQ Country:</span>
                            <span className="ml-2 text-gray-900">{supplier.hq_country}</span>
                          </div>
                        )}
                        {supplier.primary_contact_name && (
                          <div>
                            <span className="text-gray-500">Contact:</span>
                            <span className="ml-2 text-gray-900">{supplier.primary_contact_name}</span>
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

      {/* ECR Dialog */}
      {showECRDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {ecrDialogStep === 1 ? 'Which discussions to include?' : 'Want to add any other details for the ECR?'}
              </h2>
              <button
                onClick={handleDialogClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {creatingECR ? (
                // Loading State
                <div className="flex flex-col items-center justify-center py-12">
                  {ecrDocumentId ? (
                    // Success State
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-gray-700 font-medium text-lg text-center mb-2">
                        Your ECR is ready for review
                      </h3>
                      <p className="text-gray-600 text-sm text-center mb-6">
                        Verify all details before proceeding to approval workflow.
                      </p>
                      {!documentDownloaded ? (
                        <>
                          <p className="text-sm text-gray-500 mb-4">Document ID: {ecrDocumentId}</p>
                          <button
                            onClick={async () => {
                              try {
                                await ecrAPI.downloadECRDocument(ecrDocumentId)
                                setDocumentDownloaded(true)
                              } catch (err) {
                                console.error('Download failed:', err)
                                setError('Failed to download document')
                              }
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Download Document
                          </button>
                        </>
                      ) : (
                        <div className="w-full mt-4">
                          <p className="text-sm text-gray-600 text-center">
                            Document downloaded successfully. Document ID: {ecrDocumentId}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Loading State
                    <>
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-gray-700 font-medium">Creating ECR document...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take up to 2 minutes</p>
                    </>
                  )}
                </div>
              ) : error && ecrDialogStep === 2 ? (
                // Error State
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">Error: {error}</p>
                </div>
              ) : ecrDialogStep === 1 ? (
                // Step 1: Select Discussions
                discussions.length > 0 ? (
                  <div className="space-y-4">
                    {discussions.map((discussion, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDiscussions.has(index)}
                          onChange={() => handleDiscussionToggle(index)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-2">Summary:</p>
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">
                            {discussion.Summary || discussion.summary || 'No summary available'}
                          </p>
                          {discussion['Latest Update'] || discussion.latest_update ? (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500">Latest Update:</p>
                              <p className="text-xs text-gray-600">
                                {discussion['Latest Update'] || discussion.latest_update}
                              </p>
                            </div>
                          ) : null}
                          {discussion.created_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(discussion.created_at)}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No discussions available.</p>
                  </div>
                )
              ) : (
                // Step 2: Add Additional Details
                <div>
                  <textarea
                    value={ecrAdditionalDetails}
                    onChange={(e) => setEcrAdditionalDetails(e.target.value)}
                    placeholder="Enter any additional details for the ECR..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ backgroundColor: '#FFF0EB', color: '#000000' }}
                    rows={10}
                  />
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            {!creatingECR && (
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={ecrDialogStep === 1 ? handleDialogClose : handleBack}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={creatingECR}
                >
                  {ecrDialogStep === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={creatingECR}
                >
                  {ecrDialogStep === 1 ? 'Next' : 'Create ECR'}
                </button>
              </div>
            )}
            {/* Success State Footer - Always show when document is created */}
            {ecrDocumentId && (
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleDialogClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past Discussions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Discussions</h2>
        
        {loadingDiscussions ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading discussions...</p>
          </div>
        ) : discussions.length > 0 ? (
          <div className="space-y-4">
            {discussions.map((discussion, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900 mb-2">Summary:</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {discussion.Summary || discussion.summary || 'No summary available'}
                  </p>
                </div>
                
                {discussion['Latest Update'] || discussion.latest_update ? (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Latest Update:</p>
                    <p className="text-xs text-gray-600">
                      {discussion['Latest Update'] || discussion.latest_update}
                    </p>
                  </div>
                ) : null}
                
                {discussion.created_at && (
                  <div className="mt-2 text-xs text-gray-500">
                    {formatDate(discussion.created_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No discussions found.</p>
          </div>
        )}
      </div>
    </div>
  )
}


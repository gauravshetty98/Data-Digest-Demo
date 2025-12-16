import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, X, Loader2 } from 'lucide-react'
import { discussionAPI, machineDetailsAPI, supplierAPI, ecrAPI } from '../services/api'

export default function DTDiscussionDetails() {
  const { discussionId } = useParams()
  const navigate = useNavigate()
  const [discussion, setDiscussion] = useState(null)
  const [component, setComponent] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [ecrs, setEcrs] = useState([])
  const [otherDiscussions, setOtherDiscussions] = useState([])
  const [impactData, setImpactData] = useState(null)
  const [otherUsagesHierarchies, setOtherUsagesHierarchies] = useState({})
  const [expandedUsages, setExpandedUsages] = useState(new Set())
  const [suppliersExpanded, setSuppliersExpanded] = useState(false)
  const [ecrsExpanded, setEcrsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingComponent, setLoadingComponent] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingECRs, setLoadingECRs] = useState(false)
  const [loadingOtherDiscussions, setLoadingOtherDiscussions] = useState(false)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [error, setError] = useState(null)
  
  // ECR Dialog state
  const [showECRDialog, setShowECRDialog] = useState(false)
  const [selectedDiscussions, setSelectedDiscussions] = useState(new Set())
  const [ecrDialogStep, setEcrDialogStep] = useState(1)
  const [ecrAdditionalDetails, setEcrAdditionalDetails] = useState('')
  const [creatingECR, setCreatingECR] = useState(false)
  const [ecrDocumentId, setEcrDocumentId] = useState(null)
  const [documentDownloaded, setDocumentDownloaded] = useState(false)

  useEffect(() => {
    if (discussionId) {
      fetchDiscussion()
    }
  }, [discussionId])

  useEffect(() => {
    if (discussion) {
      const componentId = discussion['Component ID'] || discussion.component_id || discussion.item_id
      
      if (componentId) {
        fetchComponentDetails(componentId)
        fetchComponentImpact(componentId)
        fetchOtherDiscussions(componentId)
        fetchECRsForComponent(componentId)
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

  const fetchECRsForComponent = async (componentId) => {
    try {
      setLoadingECRs(true)
      const response = await ecrAPI.getAllECRs()
      
      if (response.success && response.ecrs) {
        // Filter ECRs that match this component_id
        const filteredECRs = response.ecrs.filter(ecr => {
          const ecrComponentId = ecr.component_id
          return ecrComponentId && ecrComponentId.toString().trim() === componentId.toString().trim()
        })
        
        // Sort by created_at (most recent first)
        filteredECRs.sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateB - dateA
        })
        
        setEcrs(filteredECRs)
      } else {
        setEcrs([])
      }
    } catch (err) {
      console.error('Error fetching ECRs for component:', err)
      setEcrs([])
    } finally {
      setLoadingECRs(false)
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

  const fetchOtherDiscussions = async (componentId) => {
    try {
      setLoadingOtherDiscussions(true)
      const decodedComponentId = decodeURIComponent(componentId)
      const response = await discussionAPI.getDiscussionsByItemId(decodedComponentId)
      
      if (response.success && response.data) {
        // Exclude the current discussion and only show Design & Technical discussions (no supplier_id)
        const filtered = response.data.filter(d => {
          const id = d.id || d.discussion_id || d.ID
          const supplierId = d['supplier_id'] || d.supplier_id
          const hasSupplierId = supplierId && supplierId.toString().trim() !== ''
          return id && id.toString() !== discussionId && !hasSupplierId
        })
        setOtherDiscussions(filtered)
      } else {
        setOtherDiscussions([])
      }
    } catch (err) {
      console.error('Error fetching other discussions:', err)
      setOtherDiscussions([])
    } finally {
      setLoadingOtherDiscussions(false)
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

  const handleECRButtonClick = () => {
    setShowECRDialog(true)
    setEcrDialogStep(1)
    setSelectedDiscussions(new Set())
    setEcrAdditionalDetails('')
    setEcrDocumentId(null)
    setDocumentDownloaded(false)
    setError(null)
  }

  const handleDialogClose = () => {
    setShowECRDialog(false)
    setEcrDialogStep(1)
    setSelectedDiscussions(new Set())
    setEcrAdditionalDetails('')
    setEcrDocumentId(null)
    setDocumentDownloaded(false)
    setCreatingECR(false)
    setError(null)
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
      if (selectedDiscussions.size === 0) {
        alert('Please select at least one discussion to include in the ECR')
        return
      }
      setEcrDialogStep(2)
    } else {
      await handleCreateECR()
    }
  }

  const handleCreateECR = async () => {
    try {
      setCreatingECR(true)
      setEcrDocumentId(null)
      setError(null)

      // Get all discussions for the component (including current one)
      const allDiscussions = [discussion, ...otherDiscussions]
      const selectedDiscussionIds = Array.from(selectedDiscussions).map(index => {
        const discussion = allDiscussions[index]
        return discussion.id || discussion.discussion_id || discussion.ID
      })

      // Call the API to create ECR
      const response = await ecrAPI.createECR(selectedDiscussionIds, ecrAdditionalDetails)

      if (response && response.document_id) {
        setEcrDocumentId(response.document_id)
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
        <div className="text-gray-500">Loading discussion details...</div>
      </div>
    )
  }

  if (error && !discussion) {
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
  const allDiscussionsForECR = [discussion, ...otherDiscussions]

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Design & Technical Discussion</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            #Design & Technical
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

      {/* ECR Button */}
      <button 
        onClick={handleECRButtonClick}
        className="w-full px-6 py-3 rounded-lg transition-colors font-medium shadow-md flex items-center justify-between" 
        style={{ backgroundColor: '#FF9B71' }}
      >
        <span className="text-left">Want to create an ECR for this component based on recent discussions?</span>
        <ChevronRight className="w-5 h-5 flex-shrink-0" />
      </button>

      {/* Current ECRs for this Component */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {/* Dropdown Header */}
        <button
          onClick={() => setEcrsExpanded(!ecrsExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-xl font-semibold text-gray-900">
            Draft ECRs for this component in pipeline {ecrs.length > 0 && `(${ecrs.length})`}
          </h2>
          {ecrsExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Dropdown Content */}
        {ecrsExpanded && (
          <div className="px-6 pb-6 border-t border-gray-200">
            {loadingECRs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                <span className="text-gray-500">Loading ECRs...</span>
              </div>
            ) : ecrs.length === 0 ? (
              <p className="text-gray-500 text-sm mt-4">No ECRs found for this component.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {ecrs.map((ecr, index) => {
                  const docId = ecr.document_id ? ecr.document_id.replace('ecr_', '').replace('.docx', '') : null
                  return (
                    <div
                      key={ecr.document_id || index}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (docId) {
                          navigate(`/ecr/${docId}/details`)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {ecr.ecr_title || 'No title available'}
                          </p>
                          {ecr.created_at && (
                            <p className="text-xs text-gray-500">
                              {formatDate(ecr.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suppliers for this Component */}
      {component && component.child_identifier && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Dropdown Header */}
          <button
            onClick={() => setSuppliersExpanded(!suppliersExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Suppliers for this Component {suppliers.length > 0 && `(${suppliers.length})`}
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

      {/* Other Discussions Related to this Component */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Other discussions related to this component</h2>
        {loadingOtherDiscussions ? (
          <div className="text-gray-500">Loading discussions...</div>
        ) : otherDiscussions.length === 0 ? (
          <div className="text-gray-500">No other discussions found for this component.</div>
        ) : (
          <div className="space-y-4">
            {otherDiscussions.map((otherDiscussion, index) => {
              const otherDiscussionId = otherDiscussion.id || otherDiscussion.discussion_id || otherDiscussion.ID
              return (
                <div
                  key={otherDiscussionId || index}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/dt-discussion/${otherDiscussionId}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          #Design & Technical
                        </span>
                        {otherDiscussion.created_at && (
                          <span className="text-xs text-gray-500">
                            {formatDate(otherDiscussion.created_at)}
                          </span>
                        )}
                      </div>
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
              allDiscussionsForECR.length > 0 ? (
                <div className="space-y-4">
                  {allDiscussionsForECR.map((discussion, index) => (
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
                  <p className="text-gray-500">No discussions available to include.</p>
                </div>
              )
            ) : (
              // Step 2: Additional Details
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={ecrAdditionalDetails}
                    onChange={(e) => setEcrAdditionalDetails(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter any additional details or context for this ECR..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          {!creatingECR && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={handleDialogClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                {ecrDialogStep === 2 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={creatingECR}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {ecrDialogStep === 1 ? 'Next' : 'Create ECR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

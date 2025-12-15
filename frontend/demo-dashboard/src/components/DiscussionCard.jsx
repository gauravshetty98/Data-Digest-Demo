import { useState, useEffect } from 'react'
import { Pen, X } from 'lucide-react'
import { discussionAPI } from '../services/api'

export default function DiscussionCard({ discussion, onClick, onUpdate }) {
  const [hierarchy, setHierarchy] = useState(null)
  const [loadingHierarchy, setLoadingHierarchy] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    item_id: '',
    summary: '',
    latest_update: '',
    supplier_id: ''
  })

  const componentId = discussion['Component ID'] || discussion.component_id || discussion.item_id
  // The database uses 'id' as the primary key column
  const discussionId = discussion.id || discussion.discussion_id || discussion.ID
  
  // Determine category based on supplier_id
  // If supplier_id exists and is not null/empty, it's a Supply Chain discussion
  const supplierId = discussion['supplier_id'] || discussion.supplier_id
  const hasSupplierId = supplierId && supplierId.toString().trim() !== ''
  const category = hasSupplierId ? 'Supply Chain' : 'Design & Technical'

  const handleClick = () => {
    if (componentId && onClick) {
      onClick(componentId)
    }
  }

  const handleEditClick = (e) => {
    e.stopPropagation() // Prevent card click
    // Initialize form with current discussion data
    setFormData({
      item_id: componentId || '',
      summary: discussion.Summary || discussion.summary || '',
      latest_update: discussion['Latest Update'] || discussion.latest_update || '',
      supplier_id: supplierId || ''
    })
    setShowEditDialog(true)
  }

  const handleCloseDialog = () => {
    setShowEditDialog(false)
    setFormData({
      item_id: '',
      summary: '',
      latest_update: '',
      supplier_id: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleConfirmEdit = async () => {
    if (!discussionId) {
      alert('Error: Discussion ID not found')
      return
    }

    // Validate required fields
    if (!formData.item_id || !formData.item_id.trim()) {
      alert('Component ID (item_id) is required')
      return
    }
    if (!formData.summary || !formData.summary.trim()) {
      alert('Summary is required')
      return
    }
    if (!formData.latest_update || !formData.latest_update.trim()) {
      alert('Latest Update is required')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        item_id: formData.item_id.trim(),
        summary: formData.summary.trim(),
        latest_update: formData.latest_update.trim(),
        supplier_id: formData.supplier_id && formData.supplier_id.trim() ? formData.supplier_id.trim() : null
      }

      // Convert discussionId to string (it might be a number from the database)
      const discussionIdStr = String(discussionId)
      
      console.log('Updating discussion:', { discussionId: discussionIdStr, payload })
      
      await discussionAPI.updateDiscussionSummary(discussionIdStr, payload)
      handleCloseDialog()
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Update error:', error)
      alert(`Failed to update discussion: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!discussionId) {
      alert('Error: Discussion ID not found')
      return
    }

    if (!confirm('Are you sure you want to delete this discussion? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await discussionAPI.deleteDiscussionSummary(discussionId)
      handleCloseDialog()
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      alert(`Failed to delete discussion: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (componentId) {
      fetchHierarchy(componentId)
    }
  }, [componentId])

  const fetchHierarchy = async (id) => {
    try {
      setLoadingHierarchy(true)
      const response = await discussionAPI.getComponentParents(id)
      
      if (response.success && response.data && response.data.length > 0) {
        // Sort items by their hierarchical path (item field)
        // Items like "1", "1.1", "1.1.3", "1.1.3.2" should be sorted properly
        const sorted = [...response.data].sort((a, b) => {
          const aParts = a.item.split('.').map(Number)
          const bParts = b.item.split('.').map(Number)
          
          // Compare each part of the path
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = aParts[i] || 0
            const bVal = bParts[i] || 0
            if (aVal !== bVal) {
              return aVal - bVal
            }
          }
          return 0
        })
        
        // Build hierarchy string by joining names with " > "
        const hierarchyString = sorted.map(item => item.name).join(' > ')
        setHierarchy(hierarchyString)
      } else {
        setHierarchy(null)
      }
    } catch (error) {
      console.error('Error fetching component hierarchy:', error)
      setHierarchy(null)
    } finally {
      setLoadingHierarchy(false)
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

  return (
    <>
    <div 
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow relative ${componentId && onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Edit button in top right */}
      <button
        onClick={handleEditClick}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="Edit discussion"
      >
        <Pen className="w-4 h-4" />
      </button>

      {/* Discussion label and category */}
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
          Discussion
        </span>
        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
          category === 'Supply Chain' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          #{category}
        </span>
      </div>

      {/* Component ID at the top */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {loadingHierarchy ? (
            <span className="text-gray-500">Loading hierarchy...</span>
          ) : hierarchy ? (
            hierarchy
          ) : (
            componentId || 'Unknown Component'
          )}
        </h3>
      </div>

      {/* Summary in the middle */}
      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed">
          {discussion.Summary || discussion.summary || 'No summary available'}
        </p>
      </div>

      {/* Latest Update at the bottom */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Latest Update:</p>
            <p className="text-sm text-gray-600">
              {discussion['Latest Update'] || discussion.latest_update || 'No update available'}
            </p>
          </div>
          <div className="text-xs text-gray-500 ml-4">
            {formatDate(discussion.created_at)}
          </div>
        </div>
      </div>
    </div>

    {/* Edit Dialog */}
    {showEditDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseDialog}>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Dialog Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Discussion</h2>
            <button
              onClick={handleCloseDialog}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dialog Body */}
          <div className="p-6 space-y-4">
            {/* Component ID / Item ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component ID (item_id)
              </label>
              <input
                type="text"
                name="item_id"
                value={formData.item_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3.2.5.11.1.3"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary
              </label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter discussion summary"
              />
            </div>

            {/* Latest Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latest Update
              </label>
              <textarea
                name="latest_update"
                value={formData.latest_update}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter latest update"
              />
            </div>

            {/* Supplier ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier ID (optional - leave empty for Design & Technical)
              </label>
              <input
                type="text"
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter supplier ID or leave empty"
              />
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Discussion'}
            </button>
            <button
              onClick={handleConfirmEdit}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Confirm Edit'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}


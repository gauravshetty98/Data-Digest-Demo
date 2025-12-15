import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { discussionAPI } from '../services/api'

export default function ECRCard({ ecr, onClick }) {
  const navigate = useNavigate()
  const [hierarchy, setHierarchy] = useState(null)
  const [loadingHierarchy, setLoadingHierarchy] = useState(false)

  const componentId = ecr.component_id

  const handleClick = () => {
    if (componentId && onClick) {
      onClick(componentId)
    }
  }

  const handleReviewClick = (e) => {
    e.stopPropagation() // Prevent card click from firing
    if (ecr.document_id) {
      // Extract document ID without .docx extension if present
      const docId = ecr.document_id.replace('.docx', '').replace('ecr_', '')
      navigate(`/ecr/${docId}/review`)
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

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow ${componentId && onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* ECR in review label */}
      <div className="mb-2">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
          ECR in review
        </span>
      </div>

      {/* Component ID at the top */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Component id:</p>
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

      {/* Description */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Description:</p>
        <p className="text-gray-700 leading-relaxed">
          {ecr.ecr_title || 'No description available'}
        </p>
      </div>

      {/* Review button at the bottom */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-end">
          <button
            onClick={handleReviewClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  )
}

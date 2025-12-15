import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { discussionAPI, ecrAPI } from '../services/api'
import DiscussionCard from './DiscussionCard'
import ECRCard from './ECRCard'

export default function DiscussionFeed() {
  const navigate = useNavigate()
  const [feedItems, setFeedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFeedItems()
  }, [])

  const fetchFeedItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch both discussions and ECRs in parallel
      const [discussionsResponse, ecrsResponse] = await Promise.all([
        discussionAPI.getAllDiscussions().catch(err => {
          console.error('Error fetching discussions:', err)
          return { success: false, data: [] }
        }),
        ecrAPI.getAllECRs().catch(err => {
          console.error('Error fetching ECRs:', err)
          return { success: false, ecrs: [] }
        })
      ])
      
      const items = []
      
      // Add discussions with type indicator
      if (discussionsResponse.success && discussionsResponse.data) {
        discussionsResponse.data.forEach(discussion => {
          items.push({
            type: 'discussion',
            data: discussion,
            timestamp: discussion.created_at || new Date().toISOString()
          })
        })
      }
      
      // Add ECRs with type indicator
      if (ecrsResponse.success && ecrsResponse.ecrs) {
        ecrsResponse.ecrs.forEach(ecr => {
          items.push({
            type: 'ecr',
            data: ecr,
            timestamp: ecr.created_at || new Date().toISOString()
          })
        })
      }
      
      // Sort by timestamp (most recent first)
      items.sort((a, b) => {
        const dateA = new Date(a.timestamp)
        const dateB = new Date(b.timestamp)
        return dateB - dateA
      })
      
      setFeedItems(items)
      
      if (items.length === 0) {
        setError('No discussions or ECRs found')
      }
    } catch (err) {
      // Provide more helpful error messages
      let errorMessage = 'Failed to fetch feed items'
      
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to backend server. Please make sure the FastAPI server is running'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      console.error('Error fetching feed items:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading feed...</div>
      </div>
    )
  }

  if (error && feedItems.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchFeedItems}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (feedItems.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No discussions or ECRs found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Engineering Feed</h2>
        <button
          onClick={fetchFeedItems}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Warning: {error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        {feedItems.map((item, index) => {
          if (item.type === 'discussion') {
            return (
              <DiscussionCard 
                key={`discussion-${index}`} 
                discussion={item.data}
                onClick={(componentId) => navigate(`/components/${encodeURIComponent(componentId)}`)}
                onUpdate={fetchFeedItems}
              />
            )
          } else if (item.type === 'ecr') {
            return (
              <ECRCard 
                key={`ecr-${index}`} 
                ecr={item.data}
                onClick={(componentId) => navigate(`/components/${encodeURIComponent(componentId)}`)}
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}


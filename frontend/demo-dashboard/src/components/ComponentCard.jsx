export default function ComponentCard({ component, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {component.name || 'Unnamed Component'}
          </h3>
          <p className="text-sm text-gray-500 font-mono">
            Item ID: {component.item || 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        {component.product && (
          <div>
            <span className="text-gray-500">Product:</span>
            <span className="ml-2 text-gray-900">{component.product}</span>
          </div>
        )}
        {component.version && (
          <div>
            <span className="text-gray-500">Version:</span>
            <span className="ml-2 text-gray-900">{component.version}</span>
          </div>
        )}
        {component.category && (
          <div>
            <span className="text-gray-500">Category:</span>
            <span className="ml-2 text-gray-900">{component.category}</span>
          </div>
        )}
        {component.material && component.material !== 'N/A' && (
          <div>
            <span className="text-gray-500">Material:</span>
            <span className="ml-2 text-gray-900">{component.material}</span>
          </div>
        )}
      </div>
    </div>
  )
}


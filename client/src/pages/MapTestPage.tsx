import React from 'react'
import { SvgMapCard } from '../components/SvgMapCard'
import { SvgMapCardOptions } from '../../../shared/types'

const MapTestPage: React.FC = () => {
  // Test data for different maps
  const testMaps: SvgMapCardOptions[] = [
    {
      mapId: 'europe-test',
      countryId: 'MT', // Malta - a small country
      countryName: 'Malta',
      svgPath: '/europe.svg'
    },
    {
      mapId: 'world-test',
      countryId: 'SG', // Singapore - a small country
      countryName: 'Singapore',
      svgPath: '/world.svg'
    },
    {
      mapId: 'us-test',
      countryId: 'DE', // Delaware - a small state
      countryName: 'Delaware',
      svgPath: '/us.svg'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Map Zoom Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the new zoom functionality on map cards. Try zooming in to see small countries more clearly!
        </p>
      </div>

      <div className="space-y-12">
        {testMaps.map((mapOptions, index) => (
          <div key={index} className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-center">
              {mapOptions.mapId.replace('-test', '').toUpperCase()} Map - Find {mapOptions.countryName}
            </h2>
            <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <strong>Auto-Zoom Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Automatic Initial Zoom:</strong> Small countries automatically zoom to at least 10x10 pixels</li>
                <li>Use the zoom controls (+ / - / reset) in the top-right corner</li>
                <li>Scroll with mouse wheel to zoom in/out</li>
                <li>Drag to pan when zoomed in</li>
                <li>Touch gestures supported on mobile</li>
              </ul>
            </div>
            <SvgMapCard
              options={mapOptions}
              showAnswer={false}
              isStudyMode={true}
              onAnswer={(correct) => {
                alert(correct ? 'Correct!' : 'Try again!')
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Zoom Features Added:</h3>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>Zoom Controls:</strong> Buttons for zoom in, zoom out, and reset view</li>
          <li>✅ <strong>Mouse Wheel Zoom:</strong> Scroll to zoom in and out</li>
          <li>✅ <strong>Pan Support:</strong> Drag to move around when zoomed in</li>
          <li>✅ <strong>Touch Support:</strong> Touch gestures for mobile devices</li>
          <li>✅ <strong>Zoom Indicator:</strong> Shows current zoom level</li>
          <li>✅ <strong>Instructions:</strong> Helpful text to guide users</li>
          <li>✅ <strong>Auto Reset:</strong> Zoom resets when switching to a new country</li>
        </ul>
      </div>
    </div>
  )
}

export default MapTestPage
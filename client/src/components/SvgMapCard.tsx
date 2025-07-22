import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { SvgMapCardOptions } from '../../../shared/types';

interface SvgMapCardProps {
  options: SvgMapCardOptions;
  showAnswer?: boolean;
  onAnswer?: (correct: boolean) => void;
  isStudyMode?: boolean;
}

// Define small countries/regions that need visual indicators by map type
const SMALL_REGIONS_BY_MAP: { [mapType: string]: string[] } = {
  'europe': [
    'AD', // Andorra
    'LI', // Liechtenstein
    'LU', // Luxembourg
    'MT', // Malta
    'MC', // Monaco
    'SM', // San Marino
    'VA', // Vatican City
    'CY', // Cyprus
    'ME', // Montenegro
    'MK', // Macedonia
    'XK', // Kosovo
    'SI', // Slovenia
    'MD'  // Moldova
  ],
  'world': [
    'AD', 'LI', 'LU', 'MT', 'MC', 'SM', 'VA', // Europe small countries
    'SG', 'BH', 'BN', 'QA', 'KW', // Small Asian countries
    'BB', 'GD', 'LC', 'VC', 'AG', 'KN', 'DM', // Caribbean islands
    'MV', 'NR', 'TV', 'PW', 'MH', 'FM', 'KI', 'TO', 'WS', 'VU', 'FJ' // Pacific islands
  ],
  'africa': [
    'DJ', 'GM', 'GW', 'GQ', 'CV', 'KM', 'MU', 'SC', 'ST' // Small African countries
  ],
  'north-america': [
    'BB', 'GD', 'LC', 'VC', 'AG', 'KN', 'DM', 'TT', 'JM' // Caribbean islands
  ],
  'us': [
    'DE', 'RI', 'CT', 'NJ', 'NH', 'VT', 'MA', 'MD', 'HI' // Small US states
  ]
};

export const SvgMapCard: React.FC<SvgMapCardProps> = ({
  options,
  showAnswer = false,
  onAnswer,
  isStudyMode = false
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialZoomCalculated, setInitialZoomCalculated] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const loadSvgContent = useCallback(async () => {
    try {
      const response = await fetch(options.svgPath);
      const svgText = await response.text();
      setSvgContent(svgText);
    } catch (error) {
      console.error('Failed to load SVG:', error);
    }
  }, [options.svgPath]);

  useEffect(() => {
    loadSvgContent();
  }, [loadSvgContent]);

  // Reset input and result state when country changes
  useEffect(() => {
    setUserAnswer('');
    setShowResult(false);
    // Reset zoom and pan when country changes, but don't reset to 1 - let calculateInitialZoom handle it
    setInitialZoomCalculated(false);
    setPanX(0);
    setPanY(0);
  }, [options.countryId, options.countryName]);

  // Calculate optimal initial zoom level based on country size and map fitting
  const calculateInitialZoom = useCallback((svgElement: SVGSVGElement, countryElement?: Element) => {
    try {
      const containerRect = mapContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return 1;

      // Get the SVG viewBox to understand the coordinate system
      const viewBox = svgElement.getAttribute('viewBox');
      let svgWidth = 1000, svgHeight = 600; // defaults
      
      if (viewBox) {
        const [, , width, height] = viewBox.split(' ').map(Number);
        svgWidth = width;
        svgHeight = height;
      }

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Calculate base zoom to fit the entire map in the container
      const baseZoomX = containerWidth / svgWidth;
      const baseZoomY = containerHeight / svgHeight;
      const baseZoom = Math.min(baseZoomX, baseZoomY) * 0.98; // 98% to leave very minimal padding

      // If no specific country element, return a much higher base zoom to fill the container
      if (!countryElement) {
        // For world maps, ensure they fill the container completely with aggressive zoom
        const enhancedBaseZoom = Math.max(baseZoom, 4.0); // Minimum 400% zoom as requested
        return Math.max(4.0, Math.min(enhancedBaseZoom, 6));
      }

      // Get the bounding box of the country in SVG coordinates
      const bbox = (countryElement as SVGGraphicsElement).getBBox();
      
      if (!bbox || bbox.width === 0 || bbox.height === 0) {
        console.warn('Invalid bounding box for country element');
        return Math.max(0.5, Math.min(baseZoom, 3));
      }
      
      // Minimum size requirement: 25x25 pixels on screen (increased from 15x15)
      const minPixelSize = 25;
      
      // Calculate how many SVG units correspond to the minimum pixel size
      const minSvgWidth = minPixelSize / baseZoom;
      const minSvgHeight = minPixelSize / baseZoom;
      
      // Calculate zoom needed to make the country at least minPixelSize
      const zoomForWidth = bbox.width < minSvgWidth ? minSvgWidth / bbox.width : 1;
      const zoomForHeight = bbox.height < minSvgHeight ? minSvgHeight / bbox.height : 1;
      
      // Use the larger zoom factor to ensure both dimensions meet the minimum
      let countryZoom = Math.max(zoomForWidth, zoomForHeight);
      
      // For very small countries (less than 10 SVG units in any dimension), apply much more aggressive zoom
      if (bbox.width < 10 || bbox.height < 10) {
        countryZoom = Math.max(countryZoom, 12); // Increased from 8x to 12x zoom for tiny countries
      }
      
      // For extremely small countries (less than 3 SVG units), apply extreme zoom
      if (bbox.width < 3 || bbox.height < 3) {
        countryZoom = Math.max(countryZoom, 25); // Increased from 15x to 25x zoom for microscopic countries
      }
      
      // For ultra-micro countries (less than 1 SVG unit), apply ultra-extreme zoom
      if (bbox.width < 1 || bbox.height < 1) {
        countryZoom = Math.max(countryZoom, 40); // 40x zoom for ultra-microscopic countries like Andorra
      }
      
      // Combine base zoom with country-specific zoom
      const finalZoom = baseZoom * countryZoom;
      
      // Ensure minimum zoom is at least 400% (4x) for map deck cards as requested
      const minZoom = Math.max(4.0, baseZoom); // At least 400% or the base zoom, whichever is higher
      
      // Clamp between reasonable bounds (increased max to 50 for ultra-small countries)
      const clampedZoom = Math.max(minZoom, Math.min(finalZoom, 50));
      
      console.log('Zoom calculation details:', {
        containerSize: `${containerWidth}x${containerHeight}`,
        svgSize: `${svgWidth}x${svgHeight}`,
        baseZoom: baseZoom.toFixed(3),
        countryBBox: `${bbox.width.toFixed(1)}x${bbox.height.toFixed(1)} at (${bbox.x.toFixed(1)},${bbox.y.toFixed(1)})`,
        countryZoom: countryZoom.toFixed(3),
        finalZoom: clampedZoom.toFixed(3)
      });
      
      return clampedZoom;
    } catch (error) {
      console.warn('Error calculating initial zoom:', error);
      // Fallback: calculate base zoom to fit map in container
      const containerRect = mapContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const baseZoom = Math.min(containerRect.width / 1000, containerRect.height / 600) * 0.98;
        return Math.max(4.0, Math.min(baseZoom, 6));
      }
      return 4.0; // Minimum 400% zoom as requested for map deck cards
    }
  }, []);

  // Zoom and pan functions
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 50)); // Increased max zoom to 50x (5000%)
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setInitialZoomCalculated(false);
    setPanX(0);
    setPanY(0);
    // Let the effect recalculate the initial zoom
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  }, [zoom, panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(50, prev * delta))); // Increased max zoom to 50x
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
    }
  }, [zoom, panX, panY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && zoom > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setPanX(touch.clientX - dragStart.x);
      setPanY(touch.clientY - dragStart.y);
    }
  }, [isDragging, dragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Get map type from SVG path
  const getMapType = (svgPath: string): string => {
    const filename = svgPath.split('/').pop()?.replace('.svg', '') || '';
    return filename;
  };

  // Improved positioning coordinates for small countries/regions based on actual SVG coordinates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSmallRegionIndicatorPosition = (countryId: string, mapType: string) => {
    // Position data organized by map type
    const positionsByMap: { [mapType: string]: { [regionId: string]: { x: number; y: number; offsetX: number; offsetY: number } } } = {
      'europe': {
        'AD': { x: 420, y: 380, offsetX: 50, offsetY: -40 }, // Andorra
        'LI': { x: 480, y: 320, offsetX: 40, offsetY: -50 }, // Liechtenstein
        'LU': { x: 440, y: 280, offsetX: -60, offsetY: -30 }, // Luxembourg
        'MT': { x: 520, y: 480, offsetX: 0, offsetY: 60 }, // Malta
        'MC': { x: 460, y: 380, offsetX: 60, offsetY: -20 }, // Monaco
        'SM': { x: 500, y: 400, offsetX: 50, offsetY: -30 }, // San Marino
        'VA': { x: 490, y: 420, offsetX: 40, offsetY: -40 }, // Vatican City
        'CY': { x: 680, y: 460, offsetX: 0, offsetY: 70 }, // Cyprus
        'ME': { x: 580, y: 400, offsetX: 60, offsetY: -30 }, // Montenegro
        'MK': { x: 600, y: 420, offsetX: 0, offsetY: 60 }, // North Macedonia
        'XK': { x: 580, y: 410, offsetX: -60, offsetY: 0 }, // Kosovo
        'SI': { x: 520, y: 350, offsetX: 0, offsetY: -60 }, // Slovenia
        'MD': { x: 660, y: 340, offsetX: 80, offsetY: 0 } // Moldova
      },
      'world': {
        // Europe small countries (scaled for world map) - corrected coordinates based on actual geography
        'AD': { x: 460, y: 210, offsetX: 30, offsetY: -25 }, // Andorra - in Pyrenees between France and Spain
        'LI': { x: 490, y: 175, offsetX: 25, offsetY: -30 }, // Liechtenstein - between Switzerland and Austria
        'LU': { x: 475, y: 165, offsetX: -35, offsetY: -20 }, // Luxembourg - between France, Belgium, Germany
        'MT': { x: 510, y: 240, offsetX: 0, offsetY: 35 }, // Malta - south of Sicily
        'MC': { x: 465, y: 215, offsetX: 35, offsetY: -15 }, // Monaco - French Riviera
        'SM': { x: 500, y: 200, offsetX: 30, offsetY: -20 }, // San Marino - within Italy
        'VA': { x: 498, y: 205, offsetX: 25, offsetY: -25 }, // Vatican City - within Rome
        // Small Asian countries
        'SG': { x: 710, y: 285, offsetX: 0, offsetY: 40 }, // Singapore - Southeast Asia, south of Malaysia
        'BH': { x: 580, y: 235, offsetX: 30, offsetY: -20 }, // Bahrain - Persian Gulf, near Saudi Arabia
        'BN': { x: 720, y: 290, offsetX: 40, offsetY: 0 }, // Brunei - Southeast Asia, on Borneo island
        'QA': { x: 585, y: 240, offsetX: 35, offsetY: -25 }, // Qatar - Persian Gulf peninsula
        'KW': { x: 575, y: 225, offsetX: 30, offsetY: -30 }, // Kuwait - Persian Gulf, north of Saudi Arabia
        // Caribbean islands
        'BB': { x: 180, y: 250, offsetX: 40, offsetY: 0 }, // Barbados
        'GD': { x: 175, y: 245, offsetX: -40, offsetY: 0 }, // Grenada
        // Pacific islands
        'MV': { x: 450, y: 280, offsetX: 0, offsetY: 50 }, // Maldives
        'NR': { x: 680, y: 290, offsetX: 40, offsetY: 0 }, // Nauru
        'TV': { x: 720, y: 310, offsetX: 0, offsetY: 40 } // Tuvalu
      },
      'us': {
        'DE': { x: 750, y: 200, offsetX: 40, offsetY: -20 }, // Delaware
        'RI': { x: 820, y: 150, offsetX: 30, offsetY: -25 }, // Rhode Island
        'CT': { x: 810, y: 160, offsetX: 35, offsetY: -20 }, // Connecticut
        'NJ': { x: 780, y: 180, offsetX: 40, offsetY: -15 }, // New Jersey
        'NH': { x: 820, y: 130, offsetX: 30, offsetY: -30 }, // New Hampshire
        'VT': { x: 800, y: 125, offsetX: -35, offsetY: -25 }, // Vermont
        'MA': { x: 825, y: 145, offsetX: 40, offsetY: -20 }, // Massachusetts
        'MD': { x: 770, y: 190, offsetX: -40, offsetY: -20 }, // Maryland
        'HI': { x: 200, y: 400, offsetX: 0, offsetY: 50 } // Hawaii
      }
    };

    const mapPositions = positionsByMap[mapType];
    if (mapPositions && mapPositions[countryId]) {
      return mapPositions[countryId];
    }

    // Default fallback position
    return { x: 500, y: 350, offsetX: 50, offsetY: -50 };
  };


  const processedSvgContent = React.useMemo(() => {
    if (!svgContent) return '';

    // Parse the SVG and highlight the target country/region
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // Get the SVG element and make it responsive
    const svgElement = svgDoc.querySelector('svg');
    if (svgElement) {
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      svgElement.setAttribute('viewBox', svgElement.getAttribute('viewBox') || '0 0 1000 600');
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgElement.style.maxWidth = '100%';
      svgElement.style.maxHeight = '100%';
    }
    
    // Determine map type from SVG path
    const mapType = getMapType(options.svgPath);
    
    // Find the target country/region element
    const targetCountry = svgDoc.querySelector(`[id="${options.countryId}"]`);
    
    // Determine if this is a small region that needs an indicator
    const smallRegions = SMALL_REGIONS_BY_MAP[mapType] || [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isSmallRegion = smallRegions.includes(options.countryId);
    
    if (targetCountry) {
      // Set highlight style for the target country/region
      targetCountry.setAttribute('fill', '#ef4444'); // Red highlight
      targetCountry.setAttribute('stroke', '#dc2626');
      targetCountry.setAttribute('stroke-width', '2');
    }
    

    // Reset all other countries/regions to default style
    const allRegions = svgDoc.querySelectorAll('path[id], polygon[id], circle[id]');
    allRegions.forEach(region => {
      if (region.getAttribute('id') !== options.countryId) {
        region.setAttribute('fill', '#e5e7eb'); // Light gray
        region.setAttribute('stroke', '#9ca3af');
        region.setAttribute('stroke-width', '1');
      }
    });

    return new XMLSerializer().serializeToString(svgDoc);
  }, [svgContent, options.countryId, options.svgPath]);

  // Effect to calculate and set initial zoom level
  useEffect(() => {
    if (!processedSvgContent || initialZoomCalculated) return;

    // Wait for the DOM to update with the new SVG content
    const timer = setTimeout(() => {
      const mapContainer = mapContainerRef.current;
      if (!mapContainer) return;

      const svgElement = mapContainer.querySelector('svg');
      if (!svgElement) return;

      // Try multiple selectors to find the target country element
      let targetCountry = svgElement.querySelector(`[id="${options.countryId}"]`);
      
      // If not found, try alternative selectors
      if (!targetCountry) {
        // Try with different case variations
        targetCountry = svgElement.querySelector(`[id="${options.countryId.toLowerCase()}"]`) ||
                       svgElement.querySelector(`[id="${options.countryId.toUpperCase()}"]`) ||
                       // Try with class selector
                       svgElement.querySelector(`[class*="${options.countryId}"]`) ||
                       // Try data attributes
                       svgElement.querySelector(`[data-id="${options.countryId}"]`) ||
                       svgElement.querySelector(`[data-country="${options.countryId}"]`) ||
                       // Try name attribute
                       svgElement.querySelector(`[name="${options.countryId}"]`);
      }
      
      // Calculate zoom - pass targetCountry if found, otherwise calculate base zoom for map fitting
      const optimalZoom = calculateInitialZoom(svgElement, targetCountry || undefined);
      setZoom(optimalZoom);
      setInitialZoomCalculated(true);
      
      console.log('Setting initial zoom:', optimalZoom, 'for country:', options.countryId, 'found element:', !!targetCountry);
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [processedSvgContent, options.countryId, initialZoomCalculated, calculateInitialZoom]);

  const handleSubmitAnswer = () => {
    const isCorrect = userAnswer.toLowerCase().trim() === options.countryName.toLowerCase().trim();
    setShowResult(true);
    if (onAnswer) {
      onAnswer(isCorrect);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim() && !showResult) {
      handleSubmitAnswer();
    }
  };

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Map Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 relative">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-1">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Zoom Level Indicator */}
        {zoom !== 1 && (
          <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-64 md:h-80 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              transformOrigin: 'center center'
            }}
            dangerouslySetInnerHTML={{ __html: processedSvgContent }}
          />
        </div>

        {/* Instructions for zoom */}
        {zoom === 1 && (
          <div className="absolute bottom-2 left-2 z-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            Use controls or scroll to zoom • Drag to pan when zoomed
          </div>
        )}
      </div>

      {/* Question/Answer Section */}
      {isStudyMode && !showAnswer && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">
            What {getMapType(options.svgPath).includes('us') ? 'state' :
                  getMapType(options.svgPath).includes('gb') || getMapType(options.svgPath).includes('fi') ||
                  getMapType(options.svgPath).includes('fr') || getMapType(options.svgPath).includes('no') ||
                  getMapType(options.svgPath).includes('se') || getMapType(options.svgPath).includes('vn') ? 'region' : 'country'} is highlighted in red?
          </h3>
          
          {!showResult ? (
            <div className="space-y-4">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter country name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className={`text-lg font-semibold mb-2 ${
                userAnswer.toLowerCase().trim() === options.countryName.toLowerCase().trim()
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {userAnswer.toLowerCase().trim() === options.countryName.toLowerCase().trim()
                  ? '✓ Correct!' 
                  : '✗ Incorrect'}
              </div>
              <div className="text-gray-700">
                Your answer: <span className="font-medium">{userAnswer}</span>
              </div>
              <div className="text-gray-700">
                Correct answer: <span className="font-medium">{options.countryName}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Answer Display (for review mode) */}
      {showAnswer && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {options.countryName}
          </h3>
        </div>
      )}
    </div>
  );
};
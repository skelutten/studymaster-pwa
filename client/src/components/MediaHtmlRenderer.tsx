import React, { useEffect, useState } from 'react'
import { getMediaContextService } from '../services/anki/MediaContextService'
import { useAuth } from '../hooks/useAuth'

interface MediaHtmlRendererProps {
  html: string
  deckId: string
  className?: string
  maxHeight?: number
}

export const MediaHtmlRenderer: React.FC<MediaHtmlRendererProps> = ({
  html,
  deckId,
  className = '',
  maxHeight
}) => {
  const { user } = useAuth()
  const mediaContext = getMediaContextService()
  const [resolvedHtml, setResolvedHtml] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolveMedia = async () => {
      if (!user?.id || !html) {
        console.log(`[MediaHtmlRenderer] No user or html, using original content`)
        setResolvedHtml(html)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        console.log(`[MediaHtmlRenderer] Resolving media for deck ${deckId}, user ${user.id}`)
        console.log(`[MediaHtmlRenderer] HTML snippet:`, html.substring(0, 200))
        console.log(`[MediaHtmlRenderer] Available mappings:`, (mediaContext as any).urlMappings.get(deckId)?.size || 0)

        const processedHtml = await mediaContext.resolveMediaReferences(
          html,
          deckId,
          user.id
        )

        console.log(`[MediaHtmlRenderer] Resolved HTML snippet:`, processedHtml.substring(0, 200))
        setResolvedHtml(processedHtml)
      } catch (err) {
        console.error('[MediaHtmlRenderer] Failed to resolve media references:', err)
        // Fall back to original HTML
        setResolvedHtml(html)
        setError('Failed to load media')
      } finally {
        setIsLoading(false)
      }
    }

    resolveMedia()
  }, [html, deckId, user?.id, mediaContext])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-gray-500">Loading media...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded ${className}`}>
        <div className="text-yellow-800 text-sm">{error}</div>
        <div
          className="mt-2 text-gray-900"
          dangerouslySetInnerHTML={{ __html: resolvedHtml }}
          style={maxHeight ? { maxHeight: `${maxHeight}px`, overflow: 'auto' } : undefined}
        />
      </div>
    )
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      style={maxHeight ? { maxHeight: `${maxHeight}px`, overflow: 'auto' } : undefined}
    />
  )
}

export default MediaHtmlRenderer
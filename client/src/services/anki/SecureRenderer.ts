import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { SanitizationResult, RenderingContext, AnkiModel, AnkiTemplate, AnkiMediaFile } from '../../../../shared/types/anki'
import { mediaStorage } from '../mediaStorageService'

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Security-focused Anki template renderer using DOMPurify
// Provides defense-in-depth HTML sanitization with Anki-specific template processing
export class SecureRenderer {
  private purify: any
  private window: Window & typeof globalThis

  constructor() {
    // CRITICAL: Configure for both browser and Node.js environments
    if (typeof window !== 'undefined') {
      // Browser environment
      this.window = window
      this.purify = DOMPurify
    } else {
      // Node.js environment (for server-side rendering)
      const dom = new JSDOM('')
      this.window = dom.window as any
      this.purify = DOMPurify(this.window)
    }

    this.configurePurifyHooks()
  }

  /**
   * Configure DOMPurify with Anki-specific hooks and security policies
   */
  private configurePurifyHooks(): void {
    // PATTERN: Follow validation.ts security approach

    // Hook to sanitize style attributes
    this.purify.addHook('uponSanitizeAttribute', (node, data) => {
      const context = this.getCurrentSanitizationContext()
      if (!context) return

      // Sanitize style attributes
      if (data.attrName === 'style' && data.attrValue) {
        const originalValue = data.attrValue
        
        // Remove dangerous CSS patterns
        let cleanValue = data.attrValue
          .replace(/javascript\s*:/gi, '')
          .replace(/expression\s*\([^)]*\)/gi, '')
          .replace(/behavior\s*:\s*url\s*\([^)]*\)/gi, '')
          .replace(/-moz-binding\s*:[^;]+;?/gi, '')
          .replace(/data\s*:\s*text\/html/gi, '')
          .replace(/vbscript\s*:/gi, '')
        
        if (cleanValue !== originalValue) {
          data.attrValue = cleanValue
          context.securityWarnings.push('Dangerous CSS content sanitized in style attribute')
        }
      }

      // Track when an attribute is actually being removed (keepAttribute is false)
      if ((data as any).keepAttribute === false && data.attrName) {
        context.modifiedAttributes.push(`${data.attrName}="${data.attrValue || ''}"`)
        
        // Add security warnings for dangerous attributes
        const attrName = data.attrName.toLowerCase()
        if (attrName.startsWith('on') || (attrName === 'href' && data.attrValue?.includes('javascript:'))) {
          context.securityWarnings.push(`Dangerous attribute ${attrName} removed`)
        }
      }
    })

    // Hook to track removed dangerous elements
    this.purify.addHook('uponSanitizeElement', (node, data) => {
      const context = this.getCurrentSanitizationContext()
      if (!context) return

      // Only track when an element is actually being removed (keepElement is false)
      if ((data as any).keepElement === false) {
        const tagName = data.tagName?.toLowerCase() || 'unknown'
        context.removedElements.push(tagName)
        
        // Add security warnings for dangerous elements
        if (['script', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 'button', 'textarea', 'select'].includes(tagName)) {
          context.securityWarnings.push(`Dangerous ${tagName} element removed`)
        }
      }
    })
  }

  /**
   * Preserve Anki template syntax by replacing with placeholders
   */
  private preserveAnkiTemplates(html: string): { html: string; templates: string[] } {
    const templates: string[] = []
    const templateRegex = /\{\{[^}]+\}\}/g
    
    let match
    let processedHtml = html
    
    while ((match = templateRegex.exec(html)) !== null) {
      const template = match[0]
      if (!templates.includes(template)) {
        templates.push(template)
      }
    }
    
    templates.forEach((template, index) => {
      const placeholder = `__ANKI_TEMPLATE_${index}__`
      processedHtml = processedHtml.replace(new RegExp(escapeRegExp(template), 'g'), placeholder)
    })
    
    return { html: processedHtml, templates }
  }

  /**
   * Restore Anki template syntax from placeholders
   */
  private restoreAnkiTemplates(html: string, templates: string[]): string {
    let processedHtml = html
    
    templates.forEach((template, index) => {
      const placeholder = `__ANKI_TEMPLATE_${index}__`
      processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), template)
    })
    
    return processedHtml
  }

  /**
   * Detect dangerous patterns in original content
   */
  private detectDangerousContent(html: string, css: string = ''): string[] {
    const warnings: string[] = []
    const combinedContent = html + css

    // Check for dangerous elements
    const dangerousElements = [
      { pattern: /<script[^>]*>/i, warning: 'Dangerous script element removed' },
      { pattern: /<iframe[^>]*>/i, warning: 'Dangerous iframe element removed' },
      { pattern: /<object[^>]*>/i, warning: 'Dangerous object element removed' },
      { pattern: /<embed[^>]*>/i, warning: 'Dangerous embed element removed' },
      { pattern: /<applet[^>]*>/i, warning: 'Dangerous applet element removed' },
      { pattern: /<form[^>]*>/i, warning: 'Form element removed' }
    ]

    // Check for dangerous attributes
    const dangerousAttributes = [
      { pattern: /\son\w+\s*=/i, warning: 'Dangerous event handler attribute removed' },
      { pattern: /javascript\s*:/i, warning: 'JavaScript URL detected' },
      { pattern: /data\s*:.*script/i, warning: 'Data URL with HTML content detected' },
      { pattern: /vbscript\s*:/i, warning: 'VBScript URL detected' }
    ]

    // Check for CSS injection patterns
    const dangerousCss = [
      { pattern: /expression\s*\(/i, warning: 'CSS expression detected' },
      { pattern: /@import/i, warning: 'CSS import statement detected' },
      { pattern: /behavior\s*:\s*url/i, warning: 'CSS behavior detected' },
      { pattern: /-moz-binding/i, warning: 'CSS -moz-binding detected' }
    ]

    // Test all patterns
    const allPatterns = [...dangerousElements, ...dangerousAttributes, ...dangerousCss]
    allPatterns.forEach(({ pattern, warning }) => {
      if (pattern.test(combinedContent)) {
        warnings.push(warning)
      }
    })

    return warnings
  }

  /**
   * Sanitize Anki template HTML with security-focused configuration
   */
  async sanitizeAnkiTemplate(
    html: string, 
    css: string = '', 
    context: Partial<RenderingContext> = {}
  ): Promise<SanitizationResult> {
    const startTime = Date.now()
    
    try {
      // Initialize sanitization tracking
      const sanitizationContext = {
        removedElements: [] as string[],
        modifiedAttributes: [] as string[],
        securityWarnings: [] as string[]
      }
      this.setCurrentSanitizationContext(sanitizationContext)

      // CRITICAL: Detect dangerous content before sanitization
      const preSecurityWarnings = this.detectDangerousContent(html, css)

      // CRITICAL: Preserve Anki templates before sanitization
      const { html: htmlWithPlaceholders, templates } = this.preserveAnkiTemplates(html)

      // Configure sanitization based on security level
      const config = this.getSanitizationConfig(context.sanitizationLevel || 'strict')
      
      // CRITICAL: Extract media references before sanitization
      const mediaReferences = this.extractMediaReferences(html)
      
      // Validate and clean CSS separately
      const sanitizedCss = this.sanitizeCss(css)
      
      // Sanitize HTML with Anki-aware configuration
      const sanitizedHtmlAny = this.purify.sanitize(htmlWithPlaceholders, config)
      const sanitizedHtml = typeof sanitizedHtmlAny === 'string'
        ? sanitizedHtmlAny
        : (sanitizedHtmlAny && typeof (sanitizedHtmlAny as any).toString === 'function'
            ? (sanitizedHtmlAny as any).toString()
            : String(sanitizedHtmlAny))
      
      // CRITICAL: Restore Anki templates after sanitization
      const htmlWithTemplates = this.restoreAnkiTemplates(sanitizedHtml, templates)
      
      // Post-processing: expand Anki templates safely and resolve media URLs
      const processedHtml = await this.processAnkiTemplates(htmlWithTemplates, context.fieldData || {}, context.mediaMap || {})
      
      // Security validation on processed content
      const postSecurityWarnings = this.validateSecurityLevel(processedHtml, sanitizedCss)
      
      const allWarnings = [
        ...preSecurityWarnings,
        ...sanitizationContext.securityWarnings, 
        ...postSecurityWarnings
      ]
      const result: SanitizationResult = {
        sanitizedHtml: processedHtml,
        originalHtml: html,
        mediaReferences,
        securityWarnings: allWarnings,
        removedElements: sanitizationContext.removedElements,
        modifiedAttributes: sanitizationContext.modifiedAttributes,
        isSecure: allWarnings.length === 0,
        sanitizationTime: Date.now() - startTime
      }

      return result
      
    } catch (error) {
      console.error('SecureRenderer sanitization failed:', error)
      
      // GOTCHA: Always provide secure fallback for security failures
      return this.createSecureFailsafe(html, startTime)
    }
  }

  /**
   * Get sanitization configuration based on security level
   */
  private getSanitizationConfig(level: 'strict' | 'moderate' | 'permissive') {
    const baseConfig = {
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      WHOLE_DOCUMENT: false,
      FORCE_BODY: false
    }

    switch (level) {
      case 'strict':
        return {
          ...baseConfig,
          ALLOWED_TAGS: [
            'div', 'span', 'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
            'img', 'audio', 'video', 'source',
            'blockquote', 'cite', 'pre', 'code',
            'sub', 'sup', 'small', 'mark', 'del', 'ins'
          ],
          ALLOWED_ATTR: [
            'class', 'id', 'title', 'alt', 'src', 'href', 'controls',
            'width', 'height', 'style', 'data-anki-field', 'data-anki-template'
          ],
          FORBID_TAGS: [
            'script', 'iframe', 'object', 'embed', 'applet', 'form',
            'input', 'button', 'textarea', 'select', 'option'
          ],
          FORBID_ATTR: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset'
          ]
        }
        
      case 'moderate':
        return {
          ...baseConfig,
          ALLOWED_TAGS: [
            'div', 'span', 'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
            'img', 'audio', 'video', 'source',
            'blockquote', 'cite', 'pre', 'code',
            'sub', 'sup', 'small', 'mark', 'del', 'ins',
            'a', 'abbr', 'acronym', 'address'
          ],
          FORBID_TAGS: [
            'script', 'iframe', 'object', 'embed', 'applet', 'form'
          ]
        }
        
      case 'permissive':
        return {
          ...baseConfig,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet'],
          FORBID_ATTR: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'
          ]
        }
        
      default:
        return baseConfig
    }
  }

  /**
   * Extract media references from HTML content
   */
  private extractMediaReferences(html: string): string[] {
    const mediaRefs: string[] = []
    const mediaPatterns = [
      /src=["']([^"']+)["']/gi,           // img, audio, video src
      /href=["']([^"']+\.(jpg|jpeg|png|gif|mp3|mp4|wav|ogg|webm))["']/gi, // links to media
      /url\(["']?([^"')]+)["']?\)/gi,    // CSS background images
      /\{\{media:([^}]+)\}\}/gi          // Anki media syntax
    ]

    mediaPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const mediaUrl = match[1]
        if (mediaUrl && !mediaRefs.includes(mediaUrl)) {
          mediaRefs.push(mediaUrl)
        }
      }
    })

    return mediaRefs
  }

  /**
   * Sanitize CSS content
   */
  private sanitizeCss(css: string): string {
    if (!css) return ''
    
    // Remove potentially dangerous CSS
    const cleanCss = css
      // Remove @import statements
      .replace(/@import\s+[^;]+;/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, '')
      // Remove expression() calls
      .replace(/expression\s*\([^)]*\)/gi, '')
      // Remove behavior: url() calls
      .replace(/behavior\s*:\s*url\s*\([^)]*\)/gi, '')
      // Remove -moz-binding
      .replace(/-moz-binding\s*:[^;]+;/gi, '')

    return cleanCss
  }

  /**
   * Process Anki template syntax in sanitized HTML
   */
  private async processAnkiTemplates(html: string, fieldData: Record<string, string>, mediaMap: Record<string, string> = {}): Promise<string> {
    let processedHtml = html

    // Only process field substitutions if we have field data
    if (Object.keys(fieldData).length > 0) {
      // Check field data for dangerous content
      const context = this.getCurrentSanitizationContext()
      Object.entries(fieldData).forEach(([fieldName, fieldValue]) => {
        const fieldWarnings = this.detectDangerousContent(fieldValue)
        if (context && fieldWarnings.length > 0) {
          context.securityWarnings.push(...fieldWarnings.map(w => `Field data warning: ${w}`))
        }
      })

      // Process field substitutions like {{Field Name}}
      Object.entries(fieldData).forEach(([fieldName, fieldValue]) => {
        const fieldRegex = new RegExp(`\\{\\{\\s*${fieldName}\\s*\\}\\}`, 'gi')
        // CRITICAL: Sanitize field values to prevent XSS
        const sanitizedValue = this.purify.sanitize(fieldValue, { 
          ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong'],
          KEEP_CONTENT: true 
        })
        processedHtml = processedHtml.replace(fieldRegex, sanitizedValue)
      })

      // Process cloze deletions like {{cloze:Text}} only when rendering
      processedHtml = processedHtml.replace(/\{\{cloze:([^}]+)\}\}/gi, (match, text) => {
        return `<span class="cloze-deletion">${this.purify.sanitize(text, { KEEP_CONTENT: true })}</span>`
      })

      // Process type fields like {{type:Field}} only when rendering
      processedHtml = processedHtml.replace(/\{\{type:([^}]+)\}\}/gi, (match, fieldName) => {
        return `<span class="type-field" data-field="${fieldName}">Type: ${fieldName}</span>`
      })
    }

    // Replace media references with PocketBase URLs
    if (Object.keys(mediaMap).length > 0) {
      Object.entries(mediaMap).forEach(([originalRef, pocketbaseUrl]) => {
        // Replace in src attributes
        const srcRegex = new RegExp(`src=["']${escapeRegExp(originalRef)}["']`, 'gi')
        processedHtml = processedHtml.replace(srcRegex, `src="${pocketbaseUrl}"`)
        
        // Replace in href attributes
        const hrefRegex = new RegExp(`href=["']${escapeRegExp(originalRef)}["']`, 'gi')
        processedHtml = processedHtml.replace(hrefRegex, `href="${pocketbaseUrl}"`)
        
        // Replace in CSS url() functions
        const urlRegex = new RegExp(`url\\(["']?${escapeRegExp(originalRef)}["']?\\)`, 'gi')
        processedHtml = processedHtml.replace(urlRegex, `url("${pocketbaseUrl}")`)
        
        // Replace Anki media syntax {{media:filename}}
        const ankiMediaRegex = new RegExp(`\\{\\{media:${escapeRegExp(originalRef)}\\}\\}`, 'gi')
        processedHtml = processedHtml.replace(ankiMediaRegex, pocketbaseUrl)
      })
    }

    return processedHtml
  }

  /**
   * Validate security level of processed content
   */
  private validateSecurityLevel(html: string, css: string): string[] {
    const warnings: string[] = []

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      { pattern: /javascript\s*:/i, warning: 'JavaScript URL detected' },
      { pattern: /data\s*:\s*text\/html/i, warning: 'Data URL with HTML content detected' },
      { pattern: /vbscript\s*:/i, warning: 'VBScript URL detected' },
      { pattern: /<script/i, warning: 'Script tag remnant detected' },
      { pattern: /on\w+\s*=/i, warning: 'Event handler attribute detected' },
      { pattern: /expression\s*\(/i, warning: 'CSS expression detected' },
      { pattern: /@import/i, warning: 'CSS import statement detected' }
    ]

    const combinedContent = html + css
    dangerousPatterns.forEach(({ pattern, warning }) => {
      if (pattern.test(combinedContent)) {
        warnings.push(warning)
      }
    })

    return warnings
  }

  /**
   * Create secure fallback when sanitization fails
   */
  private createSecureFailsafe(originalHtml: string, startTime: number): SanitizationResult {
    const fallbackHtml = '<div class="secure-fallback">Card content could not be safely rendered</div>'
    
    return {
      sanitizedHtml: fallbackHtml,
      originalHtml: originalHtml,
      mediaReferences: [],
      securityWarnings: ['Sanitization failed - using secure fallback'],
      removedElements: ['*'],
      modifiedAttributes: [],
      isSecure: true,
      sanitizationTime: Date.now() - startTime
    }
  }

  /**
   * Render complete Anki card with template and field data
   */
  async renderAnkiCard(
    model: AnkiModel,
    template: AnkiTemplate,
    fieldData: Record<string, string>,
    renderMode: 'question' | 'answer' = 'question',
    mediaFiles: AnkiMediaFile[] = []
  ): Promise<SanitizationResult> {
    const templateHtml = renderMode === 'question' 
      ? template.questionFormat 
      : template.answerFormat

    // Resolve media URLs before rendering
    const mediaMap = await this.resolveMediaUrls(templateHtml, mediaFiles)

    const context: RenderingContext = {
      modelId: model.id,
      templateId: template.id,
      fieldData,
      mediaMap,
      cspNonce: this.generateCSPNonce(),
      renderingMode: renderMode,
      sanitizationLevel: model.securityLevel === 'dangerous' ? 'strict' : 'moderate',
      allowedTags: [],
      allowedAttributes: []
    }

    return this.sanitizeAnkiTemplate(templateHtml, model.css, context)
  }

  /**
   * Resolve media URLs from PocketBase for Anki media files
   */
  private async resolveMediaUrls(
    html: string, 
    mediaFiles: AnkiMediaFile[]
  ): Promise<Record<string, string>> {
    const mediaMap: Record<string, string> = {}
    
    if (!mediaFiles || mediaFiles.length === 0) {
      return mediaMap
    }

    // Extract media references from the HTML
    const mediaReferences = this.extractMediaReferences(html)
    
    for (const ref of mediaReferences) {
      // Find matching media file by original filename
      const mediaFile = mediaFiles.find(m => 
        m.originalFilename === ref || 
        m.filename === ref ||
        ref.includes(m.originalFilename) ||
        ref.includes(m.filename)
      )
      
      if (mediaFile?.cdnUrl) {
        mediaMap[ref] = mediaFile.cdnUrl
      } else if (mediaFile?.id) {
        try {
          // Attempt to create an object URL from client-side storage (mediaHash in id)
          const url = await mediaStorage.createObjectUrl(mediaFile.id)
          if (url) {
            mediaMap[ref] = url
            // Cache the URL for future use
            mediaFile.cdnUrl = url
          }
        } catch (error) {
          console.warn(`Failed to resolve media URL for ${ref}:`, error)
        }
      }
    }
    
    return mediaMap
  }

  /**
   * Generate CSP nonce for inline styles
   */
  private generateCSPNonce(): string {
    const array = new Uint8Array(16)
    if (typeof crypto !== 'undefined') {
      crypto.getRandomValues(array)
    } else {
      // Fallback for Node.js
      const crypto = require('crypto')
      const bytes = crypto.randomBytes(16)
      for (let i = 0; i < 16; i++) {
        array[i] = bytes[i]
      }
    }
    return btoa(String.fromCharCode(...array))
  }

  // Context management for sanitization tracking
  private currentSanitizationContext: any = null

  private setCurrentSanitizationContext(context: any): void {
    this.currentSanitizationContext = context
  }

  private getCurrentSanitizationContext(): any {
    return this.currentSanitizationContext
  }

  /**
   * Cleanup method to clear hooks and context
   */
  cleanup(): void {
    this.purify.removeAllHooks()
    this.currentSanitizationContext = null
  }
}
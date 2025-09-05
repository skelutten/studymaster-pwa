/// <reference path="../pb_data/types.d.ts" />

/**
 * Enhanced Media Files Schema Migration
 * Supports comprehensive media processing with security validation, optimization, and access control
 * Designed for Anki deck imports with full media processing pipeline
 */
migrate((app) => {
  const collection = new Collection({
    "id": "enhanced_media_files",
    "name": "enhanced_media_files", 
    "type": "base",
    "system": false,
    "schema": [
      // Basic file information
      {
        "id": "filename",
        "name": "filename",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": 1,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "id": "original_filename", 
        "name": "original_filename",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 255,
          "pattern": ""
        }
      },
      
      // File storage and access
      {
        "id": "media_file",
        "name": "media_file",
        "type": "file",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": [
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm",
            "video/mp4", "video/webm", "video/ogg"
          ],
          "thumbs": ["100x100", "300x300"],
          "maxSelect": 1,
          "maxSize": 104857600,
          "protected": true
        }
      },
      
      // Size and optimization
      {
        "id": "original_size",
        "name": "original_size", 
        "type": "number",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "id": "processed_size",
        "name": "processed_size",
        "type": "number", 
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      
      // File type and media classification
      {
        "id": "mime_type",
        "name": "mime_type",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "id": "media_type",
        "name": "media_type",
        "type": "select",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["image", "audio", "video", "unknown"]
        }
      },
      
      // Processing status and timestamps
      {
        "id": "status",
        "name": "status",
        "type": "select",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["pending", "processing", "processed", "failed", "quarantined"]
        }
      },
      {
        "id": "processing_started_at",
        "name": "processing_started_at",
        "type": "date",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "id": "processing_completed_at", 
        "name": "processing_completed_at",
        "type": "date",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      
      // Security and validation
      {
        "id": "security_scan",
        "name": "security_scan", 
        "type": "json",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 50000
        }
      },
      {
        "id": "file_signature",
        "name": "file_signature",
        "type": "text",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 64,
          "max": 64,
          "pattern": "^[a-f0-9]{64}$"
        }
      },
      
      // Media properties
      {
        "id": "dimensions",
        "name": "dimensions",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1000
        }
      },
      {
        "id": "duration",
        "name": "duration",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      
      // Optimization flags
      {
        "id": "optimization_applied",
        "name": "optimization_applied",
        "type": "bool",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "metadata_stripped",
        "name": "metadata_stripped",
        "type": "bool",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      
      // Relationships
      {
        "id": "deck_id",
        "name": "deck_id",
        "type": "relation",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "decks",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "id": "user_id",
        "name": "user_id",
        "type": "relation",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["username", "email"]
        }
      },
      
      // Access control and analytics
      {
        "id": "access_count",
        "name": "access_count",
        "type": "number",
        "system": false,
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "id": "last_accessed",
        "name": "last_accessed",
        "type": "date",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      
      // Import tracking
      {
        "id": "import_batch_id",
        "name": "import_batch_id",
        "type": "text",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "id": "anki_ordinal",
        "name": "anki_ordinal", 
        "type": "text",
        "system": false,
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 20,
          "pattern": ""
        }
      }
    ],
    
    "indexes": [
      "CREATE INDEX idx_enhanced_media_files_filename ON enhanced_media_files (filename)",
      "CREATE INDEX idx_enhanced_media_files_original_filename ON enhanced_media_files (original_filename)",
      "CREATE INDEX idx_enhanced_media_files_status ON enhanced_media_files (status)",
      "CREATE INDEX idx_enhanced_media_files_mime_type ON enhanced_media_files (mime_type)",
      "CREATE INDEX idx_enhanced_media_files_media_type ON enhanced_media_files (media_type)",
      "CREATE INDEX idx_enhanced_media_files_deck_id ON enhanced_media_files (deck_id)",
      "CREATE INDEX idx_enhanced_media_files_user_id ON enhanced_media_files (user_id)", 
      "CREATE INDEX idx_enhanced_media_files_file_signature ON enhanced_media_files (file_signature)",
      "CREATE INDEX idx_enhanced_media_files_import_batch ON enhanced_media_files (import_batch_id) WHERE import_batch_id IS NOT NULL",
      "CREATE INDEX idx_enhanced_media_files_access_count ON enhanced_media_files (access_count)",
      "CREATE INDEX idx_enhanced_media_files_last_accessed ON enhanced_media_files (last_accessed) WHERE last_accessed IS NOT NULL",
      "CREATE UNIQUE INDEX idx_enhanced_media_files_deck_original ON enhanced_media_files (deck_id, original_filename)"
    ],
    
    // Access rules for security
    "listRule": "@request.auth.id != \"\" && (user_id = @request.auth.id || deck_id.user_id = @request.auth.id)",
    "viewRule": "@request.auth.id != \"\" && (user_id = @request.auth.id || deck_id.user_id = @request.auth.id)",
    "createRule": "@request.auth.id != \"\" && @request.auth.id = @request.data.user_id",
    "updateRule": "@request.auth.id != \"\" && (user_id = @request.auth.id || deck_id.user_id = @request.auth.id)",
    "deleteRule": "@request.auth.id != \"\" && (user_id = @request.auth.id || deck_id.user_id = @request.auth.id)",
    
    "options": {
      "query": {
        "maxSize": 1000
      }
    }
  })

  return app.save(collection)
}, (app) => {
  // Rollback: delete the enhanced_media_files collection
  const collection = app.findCollectionByNameOrId("enhanced_media_files")
  if (collection) {
    return app.delete(collection)
  }
  return null
})
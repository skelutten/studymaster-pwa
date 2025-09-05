/// <reference path="../pb_data/types.d.ts" />

/**
 * Enhanced Decks Schema Migration
 * Adds media processing tracking and enhanced import metadata
 */
migrate((app) => {
  // Try to find existing decks collection
  let collection = app.findCollectionByNameOrId("decks")
  
  if (!collection) {
    // Create new decks collection if it doesn't exist
    collection = new Collection({
      "id": "decks", 
      "name": "decks",
      "type": "base",
      "system": false,
      "schema": [
        {
          "id": "name",
          "name": "name",
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
          "id": "description",
          "name": "description", 
          "type": "text",
          "system": false,
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": 0,
            "max": 1000,
            "pattern": ""
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
        {
          "id": "is_public",
          "name": "is_public",
          "type": "bool",
          "system": false,
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {}
        }
      ]
    })
  }
  
  // Add enhanced media processing fields
  const newFields = [
    {
      "id": "import_source",
      "name": "import_source",
      "type": "select",
      "system": false,
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "maxSelect": 1,
        "values": ["anki_apkg", "manual", "csv", "json", "api"]
      }
    },
    {
      "id": "anki_deck_id",
      "name": "anki_deck_id", 
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
      "id": "media_processing_status",
      "name": "media_processing_status",
      "type": "select",
      "system": false,
      "required": true,
      "presentable": false,
      "unique": false,
      "options": {
        "maxSelect": 1,
        "values": ["none", "pending", "processing", "completed", "failed", "partial"]
      }
    },
    {
      "id": "media_stats",
      "name": "media_stats",
      "type": "json",
      "system": false,
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "maxSize": 10000
      }
    },
    {
      "id": "import_metadata",
      "name": "import_metadata",
      "type": "json",
      "system": false,
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "maxSize": 50000
      }
    },
    {
      "id": "last_media_sync",
      "name": "last_media_sync",
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
      "id": "security_scan_summary",
      "name": "security_scan_summary",
      "type": "json",
      "system": false,
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "maxSize": 5000
      }
    }
  ]
  
  // Add new fields to collection
  newFields.forEach((field, index) => {
    // Check if field already exists
    const existingField = collection.fields.find(f => f.name === field.name)
    if (!existingField) {
      collection.fields.addAt(collection.fields.length, new Field(field))
    }
  })
  
  // Add indexes for performance
  const newIndexes = [
    "CREATE INDEX idx_decks_user_id ON decks (user_id)",
    "CREATE INDEX idx_decks_import_source ON decks (import_source) WHERE import_source IS NOT NULL",
    "CREATE INDEX idx_decks_media_status ON decks (media_processing_status)",
    "CREATE INDEX idx_decks_anki_id ON decks (anki_deck_id) WHERE anki_deck_id IS NOT NULL",
    "CREATE INDEX idx_decks_last_sync ON decks (last_media_sync) WHERE last_media_sync IS NOT NULL",
    "CREATE INDEX idx_decks_is_public ON decks (is_public)"
  ]
  
  // Update collection indexes (append new ones)
  collection.indexes = collection.indexes || []
  newIndexes.forEach(index => {
    if (!collection.indexes.includes(index)) {
      collection.indexes.push(index)
    }
  })
  
  // Set access rules if not already set
  if (!collection.listRule) {
    collection.listRule = "user_id = @request.auth.id || is_public = true"
  }
  if (!collection.viewRule) {
    collection.viewRule = "user_id = @request.auth.id || is_public = true"
  }
  if (!collection.createRule) {
    collection.createRule = "@request.auth.id != \"\" && @request.auth.id = @request.data.user_id"
  }
  if (!collection.updateRule) {
    collection.updateRule = "@request.auth.id != \"\" && user_id = @request.auth.id"
  }
  if (!collection.deleteRule) {
    collection.deleteRule = "@request.auth.id != \"\" && user_id = @request.auth.id"
  }

  return app.save(collection)
}, (app) => {
  // Rollback: remove the added fields from decks collection
  const collection = app.findCollectionByNameOrId("decks")
  if (collection) {
    const fieldsToRemove = [
      "import_source", "anki_deck_id", "media_processing_status", 
      "media_stats", "import_metadata", "last_media_sync", "security_scan_summary"
    ]
    
    fieldsToRemove.forEach(fieldName => {
      const fieldIndex = collection.fields.findIndex(f => f.name === fieldName)
      if (fieldIndex !== -1) {
        collection.fields.removeAt(fieldIndex)
      }
    })
    
    return app.save(collection)
  }
  return null
})
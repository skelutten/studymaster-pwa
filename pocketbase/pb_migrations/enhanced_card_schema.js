const pb = require('pocketbase/cjs');

async function up() {
  await pb.collection('cards').update({
    schema: {
      difficulty: { type: 'number', default: 5.0 },
      stability: { type: 'number', default: 1.0 },
      retrievability: { type: 'number', default: 0.9 },
      fsrs_parameters: { type: 'json', default: [] },
      performance_history: { type: 'json', default: [] },
      average_response_time: { type: 'number', default: 0.0 },
      cognitive_load_index: { type: 'number', default: 0.0 },
      confidence_level: { type: 'text', default: 'building' },
      concept_similarity: { type: 'json', default: [] },
      last_cluster_review: { type: 'text', default: '' },
      contextual_difficulty: { type: 'json', default: {} },
      stability_trend: { type: 'text', default: 'stable' },
      retrievability_history: { type: 'json', default: [] },
      optimal_interval: { type: 'number', default: 1 },
    },
  });

  await pb.collection('cards').addIndex({
    fields: ['difficulty'],
    name: 'idx_cards_difficulty',
  });

  await pb.collection('cards').addIndex({
    fields: ['stability'],
    name: 'idx_cards_stability',
  });

  await pb.collection('cards').addIndex({
    fields: ['retrievability'],
    name: 'idx_cards_retrievability',
  });

  await pb.collection('cards').addIndex({
    fields: ['confidence_level'],
    name: 'idx_cards_confidence_level',
  });
}

async function down() {
  await pb.collection('cards').update({
    schema: {
      difficulty: null,
      stability: null,
      retrievability: null,
      fsrs_parameters: null,
      performance_history: null,
      average_response_time: null,
      cognitive_load_index: null,
      confidence_level: null,
      concept_similarity: null,
      last_cluster_review: null,
      contextual_difficulty: null,
      stability_trend: null,
      retrievability_history: null,
      optimal_interval: null,
    },
  });

  await pb.collection('cards').removeIndex('idx_cards_difficulty');
  await pb.collection('cards').removeIndex('idx_cards_stability');
  await pb.collection('cards').removeIndex('idx_cards_retrievability');
  await pb.collection('cards').removeIndex('idx_cards_confidence_level');
}

module.exports = { up, down };
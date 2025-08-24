const pb = require('pocketbase/cjs');

async function up() {
  await pb.collection('session_states').create({
    schema: {
      id: { type: 'text', primary: true },
      user_id: { type: 'text', required: true },
      session_momentum_score: { type: 'number', default: 0.5 },
      momentum_trend: { type: 'text', default: 'stable' },
      session_fatigue_index: { type: 'number', default: 0.0 },
      cognitive_load_capacity: { type: 'number', default: 1.0 },
      attention_span_remaining: { type: 'number', default: 1.0 },
      review_queue: { type: 'json', default: [] },
      lookahead_buffer: { type: 'json', default: [] },
      emergency_buffer: { type: 'json', default: [] },
      challenge_reserve: { type: 'json', default: [] },
      session_start_time: { type: 'text', default: '' },
      contextual_factors: { type: 'json', default: {} },
      adaptation_history: { type: 'json', default: [] },
      explanation_log: { type: 'json', default: [] },
      flow_state_metrics: { type: 'json', default: {} },
      created: { type: 'date', default: new Date() },
      updated: { type: 'date', default: new Date() },
    },
  });

  await pb.collection('session_states').addIndex({
    fields: ['user_id'],
    name: 'idx_session_states_user_id',
  });

  await pb.collection('session_states').addIndex({
    fields: ['updated'],
    name: 'idx_session_states_updated',
  });
}

async function down() {
  await pb.collection('session_states').delete();
}

module.exports = { up, down };
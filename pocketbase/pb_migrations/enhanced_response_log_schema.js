const pb = require('pocketbase/cjs');

async function up() {
  await pb.collection('response_logs').create({
    schema: {
      id: { type: 'text', primary: true },
      user_id: { type: 'text', required: true },
      card_id: { type: 'text', required: true },
      session_id: { type: 'text', required: true },
      response_time: { type: 'number', required: true },
      response_accuracy: { type: 'number', required: true },
      response_confidence: { type: 'number', required: true },
      cognitive_load: { type: 'number', required: true },
      emotional_state: { type: 'text', required: true },
      context_factors: { type: 'json', default: {} },
      timestamp: { type: 'date', default: new Date() },
      created: { type: 'date', default: new Date() },
      updated: { type: 'date', default: new Date() },
    },
  });

  await pb.collection('response_logs').addIndex({
    fields: ['user_id'],
    name: 'idx_response_logs_user_id',
  });

  await pb.collection('response_logs').addIndex({
    fields: ['card_id'],
    name: 'idx_response_logs_card_id',
  });

  await pb.collection('response_logs').addIndex({
    fields: ['session_id'],
    name: 'idx_response_logs_session_id',
  });

  await pb.collection('response_logs').addIndex({
    fields: ['timestamp'],
    name: 'idx_response_logs_timestamp',
  });
}

async function down() {
  await pb.collection('response_logs').delete();
}

module.exports = { up, down };
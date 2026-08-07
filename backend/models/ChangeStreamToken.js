import mongoose from 'mongoose';

const changeStreamTokenSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    unique: true,
    default: 'global_production_stream'
  },
  resumeToken: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  lastEventTime: {
    type: Date,
    default: Date.now
  },
  collectionName: {
    type: String,
    default: 'GLOBAL'
  }
}, {
  timestamps: true
});

const ChangeStreamToken = mongoose.models.ChangeStreamToken || mongoose.model('ChangeStreamToken', changeStreamTokenSchema);

export default ChangeStreamToken;

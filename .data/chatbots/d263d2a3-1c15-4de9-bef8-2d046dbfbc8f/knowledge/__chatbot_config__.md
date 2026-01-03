---
id: __chatbot_config__
created: 1767445973547
updated: 1767445973547
sourceDocument: __system__
sourceType: manual
chunkIndex: 0
totalChunks: 1
triggerPhrases: []
questionTypes: []
semanticTags: ["__config__"]
contextType: product_info
salesPhase: []
emotionalResonance: neutral
temporalRelevance: persistent
importanceWeight: 0
confidenceScore: 1
actionRequired: false
objectionPattern: false
antiTriggers: []
embedding: []
---

{
  "retrievalWeights": {
    "triggerPhrases": 0.15,
    "vectorSimilarity": 0.15,
    "semanticTags": 0.05,
    "questionTypes": 0.05,
    "importanceWeight": 0.2,
    "temporalRelevance": 0.1,
    "contextAlignment": 0.1,
    "confidenceScore": 0.05,
    "emotionalResonance": 0.1,
    "objectionPattern": 0.05,
    "relevanceGatekeeper": 0.05,
    "minimumFinalScore": 0.3
  },
  "maxCapsulesPerQuery": 5,
  "enableContextEnrichment": true,
  "maxConversationTurns": 50,
  "humanHandoffEnabled": true,
  "humanHandoffTriggers": [
    "talk to human",
    "real person",
    "speak to someone"
  ],
  "temperature": 0.7,
  "maxTokensPerResponse": 1000
}
import express from 'express';
import { createAgentGraph } from '../agents/orchestrator.js';

const router = express.Router();

// Graph is created lazily per request to guarantee env vars are loaded first

router.post('/agent', async (req, res, next) => {
  try {
    const { query, forced_intent } = req.body;
    
    if (!query) {
       res.status(400).json({ success: false, error: "Missing query" });
       return;
    }

    const config = { configurable: { thread_id: Date.now().toString() } };
    const agentGraph = createAgentGraph();
    
    const finalState = await agentGraph.invoke({ input_query: query, forced_intent }, config);

    res.json({
      success: true,
      intent: finalState.intent,
      summary: finalState.summary,
      preview_url: finalState.preview_url,
      map_location: finalState.map_location || null,
      result: finalState.email_draft ? 'Email sent to operator support' : finalState.report_data,
      errors: finalState.errors
    });
  } catch (error) {
    next(error);
  }
});

export default router;

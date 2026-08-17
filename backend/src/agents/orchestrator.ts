import { StateGraph, MemorySaver, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { config } from "../config/index.js";
import { sendOperatorEmail } from "../services/emailService.js";

// Define the Graph State
export const JalSetuAgentState = Annotation.Root({
  input_query: Annotation<string>(),
  forced_intent: Annotation<"support" | "data_upload" | undefined>(),
  intent: Annotation<"support" | "data_upload" | "unknown">(),
  extracted_concern: Annotation<string | undefined>(),
  target_email: Annotation<string | undefined>(),
  email_draft: Annotation<string | undefined>(),
  report_data: Annotation<{ canals?: string[]; rainfall?: number[]; coordinates?: any[] } | undefined>(),
  summary: Annotation<string | undefined>(),
  preview_url: Annotation<string | undefined>(),
  errors: Annotation<string[] | undefined>(),
});

// Initialize Groq LLM
const getModel = () => {
  if (!config.groqApiKey) {
    throw new Error("Groq API key is missing. Please set GROQ_API_KEY in .env");
  }
  return new ChatGroq({
    apiKey: config.groqApiKey,
    model: "qwen/qwen3.6-27b",
    temperature: 0,
  });
};

/**
 * Helper: strip <think>...</think> blocks and markdown fences from model output.
 * Qwen 3.6 wraps responses in thinking tokens; we must clean them.
 */
function cleanModelOutput(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')  // strip thinking blocks
    .replace(/```json/gi, '')                     // strip markdown fences
    .replace(/```/g, '')
    .trim();
}

/* ─── Node A: Supervisor Router ─── */
async function routerNode(state: typeof JalSetuAgentState.State) {
  if (state.forced_intent) {
    console.log(`[Router] Intent overridden by frontend: ${state.forced_intent}`);
    return { intent: state.forced_intent };
  }

  const model = getModel();
  const intentPrompt = `You are an intent classifier. Given the user message below, classify it as exactly one of these categories:

1. "support" — if the user is reporting a problem, complaint, asking for help, describing an issue, or requesting assistance with infrastructure (drainage, flooding, sensor, blockage, etc.)
2. "data_upload" — if the user is providing raw data, a CSV/PDF report, or asking you to parse numerical canal/rainfall data from a document.

Reply with ONLY the single word: support OR data_upload. No explanation. No punctuation. Just one word.

User message: "${state.input_query}"`;

  const response = await model.invoke(intentPrompt);
  const raw = cleanModelOutput(response.content as string).toLowerCase().trim();

  // Extract just the last word (models sometimes add preamble despite instructions)
  const words = raw.split(/\s+/);
  const lastWord = words[words.length - 1];

  let intent: "support" | "data_upload" | "unknown" = "unknown";
  if (lastWord === "support") intent = "support";
  else if (lastWord === "data_upload") intent = "data_upload";
  // Fallback: check if either keyword appears anywhere
  else if (raw.includes("data_upload")) intent = "data_upload";
  else if (raw.includes("support")) intent = "support";
  // Ultimate fallback: default to support (safer)
  else intent = "support";

  console.log(`[Router] Intent classified as: ${intent} (raw: "${raw.substring(0, 60)}")`);
  return { intent };
}

/* ─── Node B: Support Analyzer ─── */
async function supportAnalyzerNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const prompt = `You are a support analyst for a municipal water/flood management system called JalSetu (Nagpur).
Analyze this support request. Provide a 2-3 sentence summary of the core issue.
Also check if the user mentioned a specific email address to send this to.

Output ONLY valid JSON in this exact format:
{"concern": "summary of issue here", "email": "extracted_email_here_or_empty_string"}

Do NOT include any thinking or preamble. Just the raw JSON.

Request: "${state.input_query}"`;

  const response = await model.invoke(prompt);
  const content = cleanModelOutput(response.content as string);
  
  let concern = "Issue detected.";
  let target_email = undefined;
  
  try {
    const parsed = JSON.parse(content);
    concern = parsed.concern || concern;
    if (parsed.email && parsed.email.includes("@")) {
      target_email = parsed.email;
    }
  } catch(e) {
    concern = content; // fallback
  }

  console.log(`[SupportAnalyzer] Extracted concern (${concern.length} chars). Target Email: ${target_email || 'default'}`);
  return { extracted_concern: concern, target_email };
}

/* ─── Node C: Email Drafter ─── */
async function emailDrafterNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const targetEmail = state.target_email || 'bt25ece007@iiitn.ac.in';
  
  const prompt = `Draft a professional email to be sent to the municipal engineering team at ${targetEmail} regarding the following GIS infrastructure issue.

Issue Analysis: ${state.extracted_concern}
Original Report: ${state.input_query}

Format the email with:
- Subject line (on a separate line starting with "Subject:")
- Professional greeting
- Clear description of the issue
- Recommended action
- Sign off as "JalSetu AI Operator System"

Do NOT include any thinking or preamble. Output the email directly.`;

  const response = await model.invoke(prompt);
  const draft = cleanModelOutput(response.content as string);
  console.log(`[EmailDrafter] Draft created (${draft.length} chars)`);
  return { email_draft: draft };
}

/* ─── Node D: Mailer ─── */
async function mailerNode(state: typeof JalSetuAgentState.State) {
  if (state.email_draft) {
    const targetEmail = state.target_email || 'bt25ece007@iiitn.ac.in';
    try {
      const previewUrl = await sendOperatorEmail("AI Agent Support Request", state.email_draft, "high", targetEmail);
      console.log(`[Mailer] Email sent! Preview: ${previewUrl}`);
      return { summary: `Email sent to ${targetEmail}`, preview_url: previewUrl };
    } catch (err: any) {
      console.error(`[Mailer] Failed: ${err.message}`);
      return { summary: `Email drafted but delivery failed: ${err.message}` };
    }
  }
  return { summary: "No email content to send." };
}

/* ─── Node E: Data Extractor (Agent 2) ─── */
async function dataExtractorNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const retryCount = state.errors?.length || 0;

  const prompt = `You are a GIS data extraction engine. Extract canal names and rainfall figures from the text below.

RULES:
- Output ONLY valid JSON, nothing else. No explanation. No markdown.
- Use this exact format: {"canals": ["canal_name_1", "canal_name_2"], "rainfall": [45.2, 30.1]}
- If no canals found, use an empty array: {"canals": [], "rainfall": []}
- If no rainfall data found, use an empty array for rainfall.
${retryCount > 0 ? '\n⚠️ PREVIOUS ATTEMPT FAILED TO PRODUCE VALID JSON. Output ONLY the raw JSON object, nothing else.\n' : ''}
Document text:
"""
${state.input_query}
"""`;

  try {
    const response = await model.invoke(prompt);
    const content = cleanModelOutput(response.content as string);

    // Try to find JSON in the response even if there's extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[DataExtractor] Extracted: ${parsed.canals?.length || 0} canals, ${parsed.rainfall?.length || 0} rainfall readings`);
    return { report_data: parsed, errors: undefined }; // clear errors on success
  } catch (err: any) {
    const errorMsg = `Extraction error (attempt ${retryCount + 1}): ${err.message}`;
    console.error(`[DataExtractor] ${errorMsg}`);
    return { errors: [...(state.errors || []), errorMsg] };
  }
}

/* ─── Node F: Geo Validator ─── */
async function geoValidatorNode(state: typeof JalSetuAgentState.State) {
  // If errors exist from extractor, pass through for conditional retry
  if (state.errors && state.errors.length > 0) {
    console.log(`[GeoValidator] Skipping validation — extractor had errors`);
    return {};
  }

  const canals = state.report_data?.canals || [];
  const rainfall = state.report_data?.rainfall || [];

  console.log(`[GeoValidator] Validating: ${canals.length} canals, ${rainfall.length} rainfall readings`);

  // Even with empty arrays, we consider it a valid extraction (no data to map)
  const summaryParts: string[] = [];
  if (canals.length > 0) summaryParts.push(`Canals identified: ${canals.join(', ')}`);
  if (rainfall.length > 0) summaryParts.push(`Rainfall readings: ${rainfall.join('mm, ')}mm`);
  if (summaryParts.length === 0) summaryParts.push('No specific canal or rainfall data found in the report');

  return {
    summary: `Report processed successfully. ${summaryParts.join('. ')}. Data validated and ready for map sync.`
  };
}

/* ─── Setup Graph ─── */
export const createAgentGraph = () => {
  const builder = new StateGraph(JalSetuAgentState)
    .addNode("router", routerNode)
    .addNode("supportAnalyzer", supportAnalyzerNode)
    .addNode("emailDrafter", emailDrafterNode)
    .addNode("mailer", mailerNode)
    .addNode("dataExtractor", dataExtractorNode)
    .addNode("geoValidator", geoValidatorNode)

  // Edges
  builder.addEdge("__start__", "router");

  builder.addConditionalEdges("router", (state) => {
    if (state.intent === "support") return "supportAnalyzer";
    return "dataExtractor";
  });

  // Support flow: analyze → draft → mail → end
  builder.addEdge("supportAnalyzer", "emailDrafter");
  builder.addEdge("emailDrafter", "mailer");
  builder.addEdge("mailer", "__end__");

  // Data flow: extract → validate → (retry or end)
  builder.addEdge("dataExtractor", "geoValidator");

  // Conditional fallback: retry extraction once on failure
  builder.addConditionalEdges("geoValidator", (state) => {
    if (state.errors && state.errors.length > 0 && state.errors.length < 2) {
      return "dataExtractor"; // retry loop
    }
    return "__end__";
  });

  return builder.compile({ checkpointer: new MemorySaver() });
};

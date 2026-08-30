import { gateway, generateText } from "ai";

// Read-only metadata plus one minimal generation. Never print credentials,
// response headers, nested provider errors, or account/payment identifiers.
const model = "openai/gpt-5.6-luna";
const sanitize = (value) => String(value)
  .replace(/eyJ[A-Za-z0-9._-]+/g, "[REDACTED]")
  .replace(/(?:sb_secret_|sk-|vck_)[A-Za-z0-9_-]+/g, "[REDACTED]")
  .slice(0, 900);
const evidence = { at: new Date().toISOString(), model,
  oidcPresent: Boolean(process.env.VERCEL_OIDC_TOKEN),
  apiKeyPresent: Boolean(process.env.AI_GATEWAY_API_KEY), checks: [] };
for (const [name, run] of [
  ["model-catalog", async () => {
    const result = await gateway.getAvailableModels();
    return { configuredModelListed: result.models.some((entry) => entry.id === model) };
  }],
  ["credits", async () => {
    const result = await gateway.getCredits();
    return { balance: result.balance, totalUsed: result.totalUsed };
  }],
  ["minimal-generation", async () => {
    const started = Date.now();
    const result = await generateText({ model, prompt: "Responda apenas OK.",
      maxOutputTokens: 16, maxRetries: 0, abortSignal: AbortSignal.timeout(30000) });
    return { nonEmpty: Boolean(result.text.trim()), durationMs: Date.now() - started,
      finishReason: result.finishReason };
  }],
]) {
  try { evidence.checks.push({ name, result: "PASS", ...await run() }); }
  catch (error) { evidence.checks.push({ name, result: "BLOCKED", type: error.name,
    status: error.statusCode ?? null, message: sanitize(error.message) }); }
}
console.log(JSON.stringify(evidence, null, 2));

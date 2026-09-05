import assert from "node:assert/strict";
import { type Api, type Context, type Model, streamSimple } from "@earendil-works/pi-ai";
import { createBaiProviderConfig } from "./index.js";

const apiKey = process.env.BAI_API_KEY;
const modelId = process.env.BAI_MODEL ?? "qwen3.8-flash";

async function main() {
	assert.ok(apiKey, "BAI_API_KEY must be set");
	const config = await createBaiProviderConfig(apiKey);
	const configuredModel = config.models.find((model) => model.id === modelId);
	assert.ok(configuredModel, `Model ${modelId} was not returned by B.AI`);

	const model: Model<Api> = {
		...configuredModel,
		api: config.api,
		provider: "bai",
		baseUrl: config.baseUrl,
		compat: config.compat,
	};
	const context: Context = {
		messages: [{ role: "user", content: "Reply with exactly: BAI_OK", timestamp: Date.now() }],
	};
	let text = "";
	let error: string | undefined;
	for await (const event of streamSimple(model, context, { apiKey, maxTokens: 16, timeoutMs: 30_000 })) {
		if (event.type === "text_delta") text += event.delta;
		if (event.type === "error") error = event.error.errorMessage;
	}

	assert.equal(error, undefined, error);
	assert.ok(text.trim().length > 0, "B.AI returned no text");
	console.log(JSON.stringify({ model: modelId, response: text.trim() }));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});

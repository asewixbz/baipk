import assert from "node:assert/strict";
import provider, {
	BAI_API_KEY_ENV,
	BAI_BASE_URL,
	createBaiProviderConfig,
	fallbackModels,
	fetchBaiModels,
} from "./index.js";

const discoveredModels = [
	{ id: "qwen3.8-flash", owned_by: "ali", supported_endpoint_types: ["openai", "anthropic"] },
	{ id: "anthropic-only", supported_endpoint_types: ["anthropic"] },
];

async function main() {
	const discovered = await fetchBaiModels("test-key", async (input, init) => {
		assert.equal(input, `${BAI_BASE_URL}/models`);
		const headers = new Headers(init?.headers);
		assert.equal(headers.get("Authorization"), "Bearer test-key");
		assert.equal(headers.get("Accept"), "application/json");
		return new Response(JSON.stringify({ data: discoveredModels }), { status: 200 });
	});
	assert.deepEqual(
		discovered.map((model) => model.id),
		["qwen3.8-flash"],
	);
	assert.equal(discovered[0]?.name, "qwen3.8-flash (ali via B.AI)");

	const fallback = fallbackModels();
	assert.ok(fallback.length > 0);
	assert.ok(fallback.every((model) => model.reasoning === false && model.input[0] === "text"));

	const config = await createBaiProviderConfig("");
	assert.equal(config.baseUrl, BAI_BASE_URL);
	assert.equal(config.apiKey, BAI_API_KEY_ENV);
	assert.equal(config.api, "openai-completions");
	assert.equal(config.compat.maxTokensField, "max_tokens");
	assert.equal(config.compat.supportsUsageInStreaming, false);
	assert.deepEqual(config.models, fallback);

	let registration: { name: string; config: unknown } | undefined;
	await provider({
		registerProvider(name: string, providerConfig: unknown) {
			registration = { name, config: providerConfig };
		},
	} as never);
	assert.equal(registration?.name, "bai");
	assert.equal((registration?.config as { apiKey?: string }).apiKey, BAI_API_KEY_ENV);

	console.log("B.AI provider extension unit tests passed.");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

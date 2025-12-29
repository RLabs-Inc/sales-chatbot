// ============================================================================
// EMBEDDING GENERATOR
// Local embeddings using HuggingFace transformers - <5ms per query
// Model loaded once at server startup, kept in memory
// ============================================================================

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;

let model: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<void> | null = null;

export async function initializeEmbeddings(): Promise<void> {
	if (model) return;
	if (loadingPromise) return loadingPromise;

	loadingPromise = (async () => {
		console.log(`[embeddings] Loading model: ${MODEL_NAME}`);
		const start = Date.now();

		// @ts-expect-error - HuggingFace transformers pipeline returns complex union type
		model = await pipeline('feature-extraction', MODEL_NAME, {
			dtype: 'fp32'
		});

		console.log(`[embeddings] Model loaded in ${Date.now() - start}ms`);
	})();

	await loadingPromise;
}

export async function embed(text: string): Promise<number[]> {
	if (!model) {
		await initializeEmbeddings();
	}

	if (!text || !text.trim()) {
		return new Array(EMBEDDING_DIMENSION).fill(0);
	}

	const output = await model!(text.trim(), {
		pooling: 'mean',
		normalize: true
	});

	return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
	const results: number[][] = [];
	for (const text of texts) {
		results.push(await embed(text));
	}
	return results;
}

export function getEmbeddingDimension(): number {
	return EMBEDDING_DIMENSION;
}

export function isEmbeddingsReady(): boolean {
	return model !== null;
}

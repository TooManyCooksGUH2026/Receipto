import { PUBLIC_INDRA_MODEL_BASE } from '$app/env/public';
import type { IndraOcr, OcrPage } from '@ducng99/indra-ocr-js/browser';

export type ReceiptOcrProgress = {
	stage: 'loading' | 'reading' | 'done';
	percent: number;
	message: string;
	file?: string;
};

export type ReceiptOcrResult = {
	text: string;
	markdown: string;
	page: OcrPage;
	device: string;
};

let enginePromise: Promise<IndraOcr> | null = null;
let engineReady = false;
const listeners = new Set<(progress: ReceiptOcrProgress) => void>();

function emit(progress: ReceiptOcrProgress) {
	for (const listener of listeners) listener(progress);
}

function fileLabel(file: string) {
	if (file === 'det.onnx') return 'Loading line detector';
	if (file === 'rec.onnx') return 'Loading text recogniser';
	if (file === 'lm.npz') return 'Loading language model';
	if (file === 'order.onnx') return 'Loading reading order';
	if (file === 'orient.onnx') return 'Loading orientation model';
	if (file === 'meta.json') return 'Loading OCR metadata';
	return `Loading ${file}`;
}

const MODEL_BASE = PUBLIC_INDRA_MODEL_BASE?.trim() || 'datalab-to/indra-ocr';

export async function getOcrEngine(onProgress?: (progress: ReceiptOcrProgress) => void) {
	if (onProgress) {
		listeners.add(onProgress);
		onProgress(
			engineReady
				? { stage: 'loading', percent: 100, message: 'Indra OCR ready' }
				: { stage: 'loading', percent: 2, message: 'Starting on-device OCR…' }
		);
	}

	if (!enginePromise) {
		enginePromise = (async () => {
			// ORT Web is bundled locally; see scripts/copy-ort.mjs.
			const ort = await import('onnxruntime-web');
			ort.env.wasm.wasmPaths = '/ort/';
			ort.env.wasm.numThreads = 1;

			const { loadIndra } = await import('@ducng99/indra-ocr-js/browser');
			const engine = await loadIndra(MODEL_BASE, {
				cjk: false,
				order: true,
				orient: true,
				lm: true,
				threads: 1,
				progress: (progress) => {
					const total = progress.total ?? 0;
					const percent = total > 0 ? Math.min(95, 5 + Math.round((progress.loaded / total) * 90)) : 12;
					emit({
						stage: 'loading',
						percent,
						message: progress.done
							? `${fileLabel(progress.file)} — done`
							: `${fileLabel(progress.file)}…`,
						file: progress.file
					});
				}
			});
			engineReady = true;
			emit({ stage: 'loading', percent: 100, message: 'Indra OCR ready' });
			return engine;
		})().catch((error) => {
			enginePromise = null;
			engineReady = false;
			throw error;
		});
	}

	return enginePromise;
}

/**
 * Indra returns lines in reading order, but receipt columns (name on the left,
 * price on the right) can arrive as separate lines. Rebuild rows by vertical
 * overlap so the parser sees "TESCO WHITE BREAD 800G £1.15" as one line.
 */
function linesToText(lines: { box: [number, number, number, number]; text: string }[]) {
	if (!lines?.length) return '';

	const sorted = [...lines]
		.filter((line) => line.text.trim())
		.sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]);

	type Row = { top: number; bottom: number; items: typeof sorted };
	const rows: Row[] = [];

	for (const line of sorted) {
		const [y1, y2] = [line.box[1], line.box[3]];
		const height = Math.max(1, y2 - y1);
		const existing = rows.find((row) => {
			const overlap = Math.min(row.bottom, y2) - Math.max(row.top, y1);
			const smaller = Math.min(row.bottom - row.top, height);
			return overlap > Math.max(4, smaller * 0.35);
		});
		if (existing) {
			existing.items.push(line);
			existing.top = Math.min(existing.top, y1);
			existing.bottom = Math.max(existing.bottom, y2);
		} else {
			rows.push({ top: y1, bottom: y2, items: [line] });
		}
	}

	return rows
		.sort((a, b) => a.top - b.top)
		.map((row) =>
			row.items
				.sort((a, b) => a.box[0] - b.box[0])
				.map((line) => line.text.trim())
				.join(' ')
		)
		.join('\n');
}

export async function readReceiptImage(
	file: File | Blob,
	onProgress?: (progress: ReceiptOcrProgress) => void
): Promise<ReceiptOcrResult> {
	if (onProgress) listeners.add(onProgress);

	try {
		const engine = await getOcrEngine(onProgress);
		onProgress?.({
			stage: 'reading',
			percent: 55,
			message: 'Preparing the photo on your device…'
		});

		const { readGray } = await import('@ducng99/indra-ocr-js/browser');
		const gray = await readGray(file, { maxSide: 2200 });

		onProgress?.({
			stage: 'reading',
			percent: 72,
			message: 'Finding lines, prices and store name…'
		});

		const page = await engine.run(gray);
		const columnarText = linesToText(page.lines ?? []);

		onProgress?.({ stage: 'done', percent: 100, message: 'Receipt read on your device' });

		return {
			// The row reconstruction keeps item names and their prices together.
			text: columnarText || page.text || '',
			markdown: page.markdown ?? '',
			page,
			device: engine.device ?? 'wasm'
		};
	} finally {
		if (onProgress) listeners.delete(onProgress);
	}
}

export function resetOcrEngine() {
	enginePromise = null;
	engineReady = false;
}

export function isOcrReady() {
	return engineReady;
}

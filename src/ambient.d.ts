declare module '@ducng99/indra-ocr-js/browser' {
	export type OcrLine = {
		box: [number, number, number, number];
		text: string;
		conf: number;
	};

	export type OcrBlock = {
		label: string;
		bbox: [number, number, number, number];
		text: string;
	};

	export type OcrPage = {
		text: string;
		markdown: string;
		lines: OcrLine[];
		blocks: OcrBlock[];
		source?: string;
		rotation?: number;
		skew?: number;
		timings?: Record<string, number>;
	};

	export type OcrProgress = {
		file: string;
		loaded: number;
		total: number | null;
		done?: boolean;
	};

	export type IndraOcr = {
		run: (
			gray: { data: Uint8Array; width: number; height: number },
			turn?: boolean
		) => Promise<OcrPage>;
		device?: string;
	};

	export function loadIndra(
		base: string,
		options?: {
			cjk?: boolean;
			order?: boolean;
			orient?: boolean;
			lm?: boolean;
			math?: boolean;
			threads?: number;
			progress?: (progress: OcrProgress) => void;
			wasmPaths?: string;
		}
	): Promise<IndraOcr>;

	export function readGray(
		source: Blob | File | ImageBitmap | HTMLCanvasElement | string | URL,
		options?: { maxSide?: number }
	): Promise<{ data: Uint8Array; width: number; height: number }>;
}

// Defer loading heavy libraries until the worker receives a message.
import type * as ortTypes from 'onnxruntime-web';
import type { WorkerResult } from '../types/worker';

interface HeuristicScores {
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
}


function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return gray;
}

function frequencySpectrumScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * width + (x + kx)];
          const idx = (ky + 1) * 3 + (kx + 1);
          gx += sobelX[idx] * val;
          gy += sobelY[idx] * val;
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      sum += mag;
    }
  }
  const avg = sum / ((width - 2) * (height - 2));
  return avg / 255;
}

function noiseResidualScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data);
  const blur = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * width + (x + kx)];
        }
      }
      blur[y * width + x] = sum / 9;
    }
  }
  let residual = 0;
  for (let i = 0; i < gray.length; i++) {
    residual += Math.abs(gray[i] - blur[i]);
  }
  return residual / (gray.length * 255);
}

function colorHistogramScore(imageData: ImageData): number {
  const { data } = imageData;
  const bins = 16;
  const hist = new Array<number>(bins).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const val = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const idx = Math.min(bins - 1, Math.floor((val / 256) * bins));
    hist[idx] += 1;
  }
  const total = data.length / 4;
  let entropy = 0;
  for (const count of hist) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  const maxEntropy = Math.log2(bins);
  return entropy / maxEntropy;
}

function computeHeuristics(bitmap: ImageBitmap): HeuristicScores {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    frequencySpectrum: frequencySpectrumScore(imageData),
    noiseResidual: noiseResidualScore(imageData),
    colorHistogram: colorHistogramScore(imageData),
  };
}

self.addEventListener('message', async (event: MessageEvent<{ imageData: string }>) => {
  const { imageData } = event.data;
  try {
    const ort = await import('onnxruntime-web');
    (self as DedicatedWorkerGlobalScope).postMessage({ step: 'Loading model', progress: 10 });

    const response = await fetch(imageData);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const size = 28;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    ctx.drawImage(bitmap, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const input = new Float32Array(size * size);
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      input[i / 4] = avg / 255;
    }

    const session = await ort.InferenceSession.create('/models/mnist-8.onnx', {
      executionProviders: ['webgpu', 'wasm'],
    });
    (self as DedicatedWorkerGlobalScope).postMessage({ step: 'Model loaded', progress: 30 });

    const tensor = new ort.Tensor('float32', input, [1, 1, size, size]);
    const feeds: Record<string, ortTypes.Tensor> = {};
    feeds[session.inputNames[0]] = tensor as unknown as ortTypes.Tensor;
    const results = await session.run(feeds);
    const output = results[session.outputNames[0]] as ortTypes.Tensor;
    const scores = Array.from(output.data as Float32Array);
    const max = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probability = exps[0] / sum;

    (self as DedicatedWorkerGlobalScope).postMessage({ step: 'Computing heuristics', progress: 60 });
    const heuristics = computeHeuristics(bitmap);

    (self as DedicatedWorkerGlobalScope).postMessage({ step: 'Parsing EXIF data', progress: 80 });
    let cameraInfoPresent = false;
    try {
      const buffer = await blob.arrayBuffer();
      const exifr = (await import('exifr')).default;
      const exif = await exifr.parse(buffer);
      cameraInfoPresent = Boolean(exif?.Make || exif?.Model);
    } catch {
      // ignore
    }

    const finalVerdict = probability > 0.5 ? 'AI-generated' : 'Not AI-generated';

    const result: WorkerResult = {
      probability,
      cameraInfoPresent,
      finalVerdict,
      ...heuristics,
    };

    (self as DedicatedWorkerGlobalScope).postMessage({ step: 'Analysis complete', progress: 100 });
    (self as DedicatedWorkerGlobalScope).postMessage(result);
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ error: (err as Error).message });
  }
});

export {};


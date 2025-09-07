import fs from 'fs/promises';
import path from 'path';

interface ImageData { data: Uint8Array; width: number; height: number; }

function toGrayscale(data: Uint8Array): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return gray;
}

function frequencySpectrumScore(image: ImageData): number {
  const { data, width, height } = image;
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

function noiseResidualScore(image: ImageData): number {
  const { data, width, height } = image;
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

function colorHistogramScore(image: ImageData): number {
  const { data } = image;
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

async function getImageData(file: string): Promise<ImageData> {
  const { Jimp } = await import('jimp');
  const img = await Jimp.read(file);
  const { data, width, height } = img.bitmap;
  return { data: data as Uint8Array, width, height };
}

async function evaluateImage(file: string) {
  const image = await getImageData(file);
  return {
    frequencySpectrum: frequencySpectrumScore(image),
    noiseResidual: noiseResidualScore(image),
    colorHistogram: colorHistogramScore(image),
  };
}

async function loadDataset(root: string) {
  const labels: string[] = ['real', 'ai'];
  const samples: { label: string; file: string }[] = [];
  for (const label of labels) {
    const dir = path.join(root, label);
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (f.startsWith('.')) continue;
      samples.push({ label, file: path.join(dir, f) });
    }
  }
  return samples;
}

async function main() {
  const datasetDir = path.resolve('data/validation');
  const samples = await loadDataset(datasetDir);
  if (samples.length === 0) {
    console.warn('No validation images found in data/validation.');
    return;
  }
  const results: { label: string; noise: number }[] = [];
  for (const s of samples) {
    const scores = await evaluateImage(s.file);
    results.push({ label: s.label, noise: scores.noiseResidual });
  }

  let bestAcc = 0;
  let bestTh = 0;
  for (let th = 0; th <= 1; th += 0.01) {
    let correct = 0;
    for (const r of results) {
      const pred = r.noise > th ? 'real' : 'ai';
      if (pred === r.label) correct++;
    }
    const acc = correct / results.length;
    if (acc > bestAcc) {
      bestAcc = acc;
      bestTh = th;
    }
  }

  console.log(`Best threshold: ${bestTh.toFixed(2)}`);
  console.log(`Accuracy: ${(bestAcc * 100).toFixed(2)}%`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

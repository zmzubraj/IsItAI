'use client';

export interface HeuristicScores {
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
}

function getImageData(image: HTMLImageElement | HTMLCanvasElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
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

export function computeHeuristics(
  image: HTMLImageElement | HTMLCanvasElement,
): HeuristicScores {
  const imageData = getImageData(image);
  return {
    frequencySpectrum: frequencySpectrumScore(imageData),
    noiseResidual: noiseResidualScore(imageData),
    colorHistogram: colorHistogramScore(imageData),
  };
}

export default computeHeuristics;


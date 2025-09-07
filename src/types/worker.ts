export interface WorkerResult {
  probability: number;
  cameraInfoPresent: boolean;
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
  finalVerdict: string;
}


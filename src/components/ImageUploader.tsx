'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ResultPanel from './ResultPanel';

interface ImageUploaderProps {
  onFileSelect: (dataUrl: string) => void;
  maxSizeMB?: number;
}

interface WorkerResult {
  probability: number;
  cameraInfoPresent: boolean;
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
  finalVerdict: string;
}

export default function ImageUploader({ onFileSelect, maxSizeMB = 5 }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    const worker = new Worker(new URL('./detectorWorker.ts', import.meta.url));
    workerRef.current = worker;
    const handler = (e: MessageEvent<WorkerResult>) => {
      if ('probability' in e.data) {
        setResult(e.data);
        setLoading(false);
      }
    };
    worker.addEventListener('message', handler);
    return () => {
      worker.removeEventListener('message', handler);
      worker.terminate();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB.`);
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setLoading(true);
      onFileSelect(dataUrl);
      workerRef.current?.postMessage({ imageData: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError('');
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      <input type="file" accept="image/*" onChange={handleChange} />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {preview && (
        <Image
          src={preview}
          alt="Preview"
          width={200}
          height={200}
          className="mt-4 rounded object-contain"
        />
      )}
      <ResultPanel result={result} loading={loading} onReset={handleReset} />
      <p className="mt-2 text-xs text-gray-500">No data leaves your device</p>
    </div>
  );
}


'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  onFileSelect: (dataUrl: string) => void;
  maxSizeMB?: number;
}

export default function ImageUploader({ onFileSelect, maxSizeMB = 5 }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

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
      const result = reader.result as string;
      setPreview(result);
      onFileSelect(result);
    };
    reader.readAsDataURL(file);
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
      <p className="mt-2 text-xs text-gray-500">No data leaves your device</p>
    </div>
  );
}


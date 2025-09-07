import { PDFDocument, StandardFonts } from 'pdf-lib';

interface WorkerResult {
  probability: number;
  cameraInfoPresent: boolean;
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
  finalVerdict: string;
}

export async function generateCertificate(imageDataUrl: string, result: WorkerResult) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Logo
  try {
    const logoBytes = await fetch('/logo.png').then((res) => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.5);
    page.drawImage(logoImage, {
      x: 40,
      y: height - logoDims.height - 40,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch {
    // ignore
  }

  page.drawText('IsItAI Analysis Certificate', {
    x: 200,
    y: height - 60,
    size: 18,
    font,
  });

  // Uploaded image
  const imgBytes = await fetch(imageDataUrl).then((res) => res.arrayBuffer());
  let embeddedImg;
  if (imageDataUrl.startsWith('data:image/png')) {
    embeddedImg = await pdfDoc.embedPng(imgBytes);
  } else {
    embeddedImg = await pdfDoc.embedJpg(imgBytes);
  }
  const imgWidth = 200;
  const imgHeight = (embeddedImg.height / embeddedImg.width) * imgWidth;
  page.drawImage(embeddedImg, {
    x: 40,
    y: height - imgHeight - 120,
    width: imgWidth,
    height: imgHeight,
  });

  // Parameter table
  const params = [
    ['Frequency Spectrum', result.frequencySpectrum.toFixed(2)],
    ['Noise Residual', result.noiseResidual.toFixed(2)],
    ['Color Histogram', result.colorHistogram.toFixed(2)],
    ['Camera Info Present', result.cameraInfoPresent ? 'Yes' : 'No'],
    ['Overall Confidence', `${(result.probability * 100).toFixed(2)}%`],
  ];

  let y = height - 150;
  const lineHeight = 16;
  params.forEach(([label, value]) => {
    page.drawText(`${label}: ${value}`, {
      x: 260,
      y,
      size: 12,
      font,
    });
    y -= lineHeight;
  });

  const verdict = result.finalVerdict === 'AI-generated' ? 'AI Generated' : 'Real Photo';
  page.drawText(`Verdict: ${verdict}`, {
    x: 260,
    y: y - lineHeight,
    size: 12,
    font,
  });

  // Timestamp
  const timestamp = new Date().toLocaleString();
  page.drawText(`Generated: ${timestamp}`, {
    x: 40,
    y: 60,
    size: 10,
    font,
  });

  // Signature
  try {
    const sigBytes = await fetch('/signature.png').then((res) => res.arrayBuffer());
    const sigImage = await pdfDoc.embedPng(sigBytes);
    const sigDims = sigImage.scale(0.5);
    page.drawImage(sigImage, {
      x: width - sigDims.width - 40,
      y: 80,
      width: sigDims.width,
      height: sigDims.height,
    });
  } catch {
    // ignore
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'IsItAI_Certificate.pdf';
  link.click();
  URL.revokeObjectURL(link.href);
}

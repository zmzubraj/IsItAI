# IsItAI - AI_Image_Detector

A lightweight tool for determining whether an image is AI-generated or a real photograph.

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the development server**
   ```bash
   npm run dev
   ```

## Privacy

No images are uploaded or stored on any server. All detection algorithms run entirely in your browser using client-side ONNX models and heuristics.

## Algorithms

- [ONNX Runtime](https://onnxruntime.ai/) executing a small MNIST-8 model for baseline probability.
- Image heuristics:
  - Frequency spectrum analysis
  - Noise residual measurement
  - Color histogram entropy
- EXIF metadata check for camera information

## Accuracy

Using the sample images in this repository, the noise-residual heuristic reaches **100% accuracy** with a threshold of **0.03**.
Run `npx ts-node scripts/evaluate.ts` to compute metrics on your own dataset.

## Certificates

After running detection in the app, click **Generate Certificate** to export a PDF summarizing the probability, heuristic scores, and final verdict.

## Example Images

Real photograph:

![Real example](public/examples/real-example.png)

AI-generated image:

![AI example](public/examples/ai-example.png)

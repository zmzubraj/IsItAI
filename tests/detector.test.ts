import detectImage from '../src/utils/detector';
import { DetectionResult } from '../src/utils/detector';

jest.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: jest.fn().mockResolvedValue({
      inputNames: ['input'],
      outputNames: ['output'],
      run: jest.fn().mockResolvedValue({
        output: { data: new Float32Array([2, 1]) },
      }),
    }),
  },
  Tensor: jest.fn().mockImplementation((_type: string, data: Float32Array) => ({
    data,
  })),
}));

describe('detectImage', () => {
  let result: DetectionResult;
  let SAMPLE_IMAGE_DATA: ImageData;

  beforeAll(async () => {
    SAMPLE_IMAGE_DATA = {
      data: new Uint8ClampedArray(28 * 28 * 4),
      width: 28,
      height: 28,
    } as ImageData;
    jest.spyOn(document, 'createElement').mockImplementation(
      () => ({
        width: 28,
        height: 28,
        getContext: () =>
          ({
            drawImage: jest.fn(),
            getImageData: () => SAMPLE_IMAGE_DATA,
          } as unknown as CanvasRenderingContext2D),
      } as unknown as HTMLCanvasElement),
    );

    const image = { width: 28, height: 28 } as unknown as HTMLCanvasElement;
    result = await detectImage(image);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('performs model inference and returns probability', () => {
    const expected = 1 / (1 + Math.exp(-1));
    expect(result.probability).toBeCloseTo(expected);
    expect(result.cameraInfoPresent).toBe(false);
  });

  it('computes heuristic scores', () => {
    expect(result.frequencySpectrum).toBe(0);
    expect(result.noiseResidual).toBe(0);
    expect(result.colorHistogram).toBe(0);
  });
});

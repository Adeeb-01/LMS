import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Global mocks for problematic ESM modules
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue({}),
}), { virtual: true });

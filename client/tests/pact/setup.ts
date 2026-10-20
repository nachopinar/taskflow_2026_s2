import { afterEach, beforeEach, vi } from 'vitest';
import { setToken } from '../../src/lib/api';
import { CONTRACT_TOKEN, stubLocalStorage } from './helpers';

beforeEach(() => {
  stubLocalStorage();
  setToken(CONTRACT_TOKEN);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

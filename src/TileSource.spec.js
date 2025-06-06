'use strict';
import TileSource from './TileSource.ts';

describe('TileSource', () => {
  describe('with a HTTP source', () => {
    test('sets the mode to 3', async () => {
      const tileSource = new TileSource();
      await tileSource.init('http://mapscii.me/');
      expect(tileSource.mode).toBe(3);
    });
  });
});

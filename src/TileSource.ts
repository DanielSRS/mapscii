/*
  termap - Terminal Map Viewer
  by Michael Strassburger <codepoet@cpan.org>

  Source for VectorTiles - supports
  * remote TileServer
  * local MBTiles and VectorTiles
*/
'use strict';
import fs from 'fs';
import path from 'path';
import envPaths from 'env-paths';
const paths = envPaths('mapscii');

import Tile from './Tile.js';
import config from './config.ts';

// https://github.com/mapbox/node-mbtiles has native build dependencies (sqlite3)
// To maximize MapSCII's compatibility, MBTiles support must be manually added via
// $> npm install -g @mapbox/mbtiles
let MBTiles: unknown = null;
try {
  MBTiles = (await import('@mapbox/mbtiles')).default;
} catch (err) {
  void 0;
}

const modes = {
  MBTiles: 1,
  VectorTile: 2,
  HTTP: 3,
} as const;

type sourceMode = (typeof modes)[keyof typeof modes];

class TileSource {
  private source?: string;
  private cache: Record<string, Tile> = {};
  private cacheSize: number = 0;
  private cached: string[] = [];
  private mode: sourceMode | null = null;
  private mbtiles: unknown;
  private styler: unknown;

  /**
   * Initialize the tile source with the specified source URL or path
   * @param source - The URL or file path to load tiles from
   * @returns Promise that resolves when initialization is complete
   * @throws Error if source type is not supported
   */
  init(source: string) {
    this.source = source;

    this.cache = {};
    this.cacheSize = 16;
    this.cached = [];

    this.mode = null;
    this.mbtiles = null;
    this.styler = null;

    if (this.source.startsWith('http')) {
      if (config.persistDownloadedTiles) {
        this._initPersistence();
      }

      this.mode = modes.HTTP;
      return Promise.resolve();
    } else if (this.source.endsWith('.mbtiles')) {
      if (!MBTiles) {
        throw new Error(
          "MBTiles support must be installed with following command: 'npm install -g @mapbox/mbtiles'",
        );
      }

      this.mode = modes.MBTiles;
      return this.loadMBTiles(source);
    } else {
      throw new Error("source type isn't supported yet");
    }
  }

  /**
   * Load an MBTiles file as the tile source
   * @param source - Path to the MBTiles file
   */
  loadMBTiles(source: string) {
    return new Promise<void>((resolve, reject) => {
      new MBTiles(source, (err: Error | null, mbtiles: unknown) => {
        if (err) {
          reject(err);
        }
        this.mbtiles = mbtiles;
        resolve();
      });
    });
  }

  /**
   * Sets the styler to use for rendering tiles
   * @param styler - The styler instance to use
   */
  useStyler(styler: unknown): void {
    this.styler = styler;
  }

  /**
   * Gets a tile for the specified coordinates
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @throws Error if no TileSource is defined
   * @throws Error if the tile mode is unsupported
   * @returns Promise resolving to a Tile
   */
  getTile(z: number, x: number, y: number) {
    if (!this.mode) {
      throw new Error('no TileSource defined');
    }

    const cached = this.cache[[z, x, y].join('-')];
    if (cached) {
      return Promise.resolve(cached);
    }

    if (this.cached.length > this.cacheSize) {
      const overflow = Math.abs(this.cacheSize - this.cache.length);
      for (const tile in this.cached.splice(0, overflow)) {
        delete this.cache[tile];
      }
    }

    switch (this.mode) {
      case modes.MBTiles:
        return this._getMBTile(z, x, y);
      case modes.HTTP:
        return this._getHTTP(z, x, y);
      default:
        // This was not here originally, but seems to exist a vectortile mode that is not
        // checked for
        throw new Error('Unsupported tile mode');
    }
  }

  /**
   * Retrieves a tile from an HTTP source
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Promise resolving to a Tile
   */
  async _getHTTP(z: number, x: number, y: number) {
    let promise: Promise<Buffer>;
    const persistedTile = this._getPersited(z, x, y);
    if (config.persistDownloadedTiles && persistedTile) {
      promise = Promise.resolve(persistedTile);
    } else {
      promise = fetch(this.source + [z, x, y].join('/') + '.pbf')
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const bufferObj = Buffer.from(buffer);
          if (config.persistDownloadedTiles) {
            this._persistTile(z, x, y, bufferObj);
            return bufferObj;
          }
          // This was not here, but sence node-fetch was removed, maybe it is needed now
          return bufferObj;
        });
    }
    return promise.then(buffer => {
      return this._createTile(z, x, y, buffer);
    });
  }

  /**
   * Retrieves a tile from an MBTiles source
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns A Tile
   */
  _getMBTile(z: number, x: number, y: number) {
    return new Promise((resolve, reject) => {
      this.mbtiles.getTile(z, x, y, (err: Error | null, buffer: Buffer) => {
        if (err) {
          reject(err);
        }
        resolve(this._createTile(z, x, y, buffer));
      });
    });
  }

  /**
   * Creates a new tile and adds it to the cache
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param buffer - Tile data
   * @returns The created tile
   */
  _createTile(z: number, x: number, y: number, buffer: Buffer) {
    const name = [z, x, y].join('-');
    this.cached.push(name);

    const tile = (this.cache[name] = new Tile(this.styler));
    return tile.load(buffer);
  }

  /**
   * Initializes the persistence system
   */
  _initPersistence(): void {
    try {
      this._createFolder(paths.cache);
    } catch (error) {
      config.persistDownloadedTiles = false;
    }
  }

  /**
   * Persists a tile to the filesystem
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param buffer - Tile data to persist
   */
  _persistTile(z: number, x: number, y: number, buffer: Buffer) {
    const zoom = z.toString();
    this._createFolder(path.join(paths.cache, zoom));
    const filePath = path.join(paths.cache, zoom, `${x}-${y}.pbf`);
    return fs.writeFile(filePath, buffer, () => null);
  }

  /**
   * Retrieves a persisted tile from the cache
   * @param z - Zoom level
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns The tile buffer or false if not found
   */
  _getPersited(z: number, x: number, y: number) {
    try {
      return fs.readFileSync(
        path.join(paths.cache, z.toString(), `${x}-${y}.pbf`),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a folder if it doesn't exist
   * @param path - Path to create
   * @returns Success status
   * @throws Error if folder creation fails
   */
  _createFolder(path: string) {
    try {
      fs.mkdirSync(path);
      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') return true;
      throw error;
    }
  }
}

export default TileSource;

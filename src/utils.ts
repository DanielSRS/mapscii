/*
  termap - Terminal Map Viewer
  by Michael Strassburger <codepoet@cpan.org>

  methods used all around
*/
'use strict';
import config from './config.ts';

/**
 * Geographic and mathematical constants used in map calculations
 */
const constants = {
  /** Earth's radius in meters at the equator */
  RADIUS: 6378137,
};

const utils = {
  /**
   * Constrains a number to be within a specified range.
   *
   * @param num - The number to clamp
   * @param min - The minimum value of the range
   * @param max - The maximum value of the range
   * @returns The clamped value
   */
  clamp: (num: number, min: number, max: number) => {
    if (num <= min) {
      return min;
    } else if (num >= max) {
      return max;
    } else {
      return num;
    }
  },

  /**
   * Calculates the base zoom level, ensuring it's within valid tile range.
   *
   * @param zoom - The zoom level to normalize
   * @returns The base zoom level as an integer within valid range
   */
  baseZoom: (zoom: number) => {
    return Math.min(config.tileRange, Math.max(0, Math.floor(zoom)));
  },

  /**
   * Calculates the tile size at a specific zoom level.
   *
   * @param zoom - The zoom level
   * @returns The tile size at the specified zoom level
   */
  tilesizeAtZoom: (zoom: number) => {
    return config.projectSize * Math.pow(2, zoom - utils.baseZoom(zoom));
  },

  /**
   * Converts degrees to radians.
   *
   * @param angle - The angle in degrees
   * @returns The angle in radians
   */
  deg2rad: (angle: number) => {
    // (angle / 180) * Math.PI
    return angle * 0.017453292519943295;
  },

  /**
   * Converts longitude/latitude coordinates to tile coordinates at a specific zoom level.
   * Uses the Web Mercator projection standard for mapping.
   *
   * @param lon - The longitude in degrees
   * @param lat - The latitude in degrees
   * @param zoom - The zoom level
   * @returns The tile coordinates {x, y, z}
   */
  ll2tile: (lon: number, lat: number, zoom: number) => {
    return {
      x: ((lon + 180) / 360) * Math.pow(2, zoom),
      y:
        ((1 -
          Math.log(
            Math.tan((lat * Math.PI) / 180) +
              1 / Math.cos((lat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
        Math.pow(2, zoom),
      z: zoom,
    };
  },

  /**
   * Converts tile coordinates back to longitude/latitude coordinates.
   * Inverse operation of ll2tile.
   *
   * @param x - The tile x coordinate
   * @param y - The tile y coordinate
   * @param zoom - The zoom level
   * @returns The geographic coordinates as a LonLat object
   */
  tile2ll: (x: number, y: number, zoom: number): LonLat => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);

    return {
      lon: (x / Math.pow(2, zoom)) * 360 - 180,
      lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    };
  },

  /**
   * Calculates the number of meters per pixel at a specific zoom level and latitude.
   * Used for scale calculations and distance measurements on the map.
   *
   * @param zoom - The zoom level
   * @param lat - The latitude in degrees (defaults to 0, the equator)
   * @returns The number of meters represented by one pixel
   */
  metersPerPixel: (zoom: number, lat: number = 0) => {
    return (
      (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * constants.RADIUS) /
      (256 * Math.pow(2, zoom))
    );
  },

  /**
   * Converts a hexadecimal color string to an RGB array.
   * Supports both 3-digit and 6-digit hex color formats.
   *
   * @param color - The hex color string (format: #RGB or #RRGGBB)
   * @returns Array of RGB values as [r, g, b], each ranging from 0-255
   * @throws Error if the color string format is invalid
   */
  hex2rgb: (color: string) => {
    if (typeof color !== 'string') return [255, 0, 0];

    if (!/^#[a-fA-F0-9]{3,6}$/.test(color)) {
      throw new Error(`${color} isn't a supported hex color`);
    }

    color = color.substr(1);
    const decimal = parseInt(color, 16);

    if (color.length === 3) {
      const rgb = [decimal >> 8, (decimal >> 4) & 15, decimal & 15];
      return rgb.map(c => {
        return c + (c << 4);
      });
    } else {
      return [(decimal >> 16) & 255, (decimal >> 8) & 255, decimal & 255];
    }
  },

  /**
   * Rounds a number to a specified number of decimal places.
   * Useful for formatting display values and limiting precision.
   *
   * @param number - The number to round
   * @param digits - The number of decimal places to keep
   * @returns The rounded number with the specified precision
   */
  digits: (number: number, digits: number) => {
    return Math.floor(number * Math.pow(10, digits)) / Math.pow(10, digits);
  },

  /**
   * Normalizes longitude and latitude coordinates to valid ranges.
   * Wraps longitude values outside of [-180, 180] range.
   * Clamps latitude values to the valid Mercator projection range of [-85.0511, 85.0511].
   *
   * @param ll - The longitude/latitude object to normalize
   * @returns The normalized longitude/latitude object
   */
  normalize: (ll: LonLat): LonLat => {
    if (ll.lon < -180) ll.lon += 360;
    if (ll.lon > 180) ll.lon -= 360;

    if (ll.lat > 85.0511) ll.lat = 85.0511;
    if (ll.lat < -85.0511) ll.lat = -85.0511;

    return ll;
  },

  /**
   * Counts the number of set bits (1s) in the binary representation of a number.
   * Also known as Hamming weight or population count.
   *
   * @param val - The number to count bits for
   * @returns The count of set bits in the number
   */
  population: (val: number) => {
    let bits = 0;
    while (val > 0) {
      bits += val & 1;
      val >>= 1;
    }
    return bits;
  },
};

export default utils;

/**
 * Interface representing geographic coordinates with longitude and latitude.
 */
interface LonLat {
  /** Longitude in degrees, range [-180, 180] */
  lon: number;
  /** Latitude in degrees, range [-85.0511, 85.0511] for Mercator projection */
  lat: number;
}

/*
  termap - Terminal Map Viewer
  by Michael Strassburger <codepoet@cpan.org>

  Using 2D spatial indexing to avoid overlapping labels and markers
  and to find labels underneath a mouse cursor's position
*/
'use strict';
import RBush from 'rbush';
import stringWidth from 'string-width';

/**
 * A buffer for managing and positioning labels on a map
 * Uses a spatial index to prevent overlapping
 */
interface LabelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature?: unknown;
}

class LabelBuffer {
  private tree: RBush<LabelBounds>;
  private margin: number;

  /**
   * Creates a new label buffer
   */
  constructor() {
    this.tree = new RBush();
    this.margin = 5;
  }

  /**
   * Clears all labels from the buffer
   */
  clear(): void {
    this.tree.clear();
  }

  /**
   * Projects display coordinates to buffer coordinates
   * @param x - X coordinate to project
   * @param y - Y coordinate to project
   * @returns Projected coordinates as [x, y]
   */
  project(x: number, y: number): [number, number] {
    return [Math.floor(x / 2), Math.floor(y / 4)];
  }

  /**
   * Attempts to write text at the specified position if space is available
   * @param text - Text to write
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param feature - Map feature associated with this label
   * @param margin - Optional margin override
   */
  writeIfPossible(
    text: string,
    x: number,
    y: number,
    feature: unknown,
    margin?: number,
  ) {
    margin = margin || this.margin;

    const point = this.project(x, y);

    if (this._hasSpace(text, point[0], point[1])) {
      const data = this._calculateArea(text, point[0], point[1], margin);
      data.feature = feature;
      return this.tree.insert(data);
    } else {
      return false;
    }
  }

  /**
   * Finds features at the specified coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  featuresAt(x: number, y: number) {
    this.tree.search({ minX: x, maxX: x, minY: y, maxY: y });
  }

  /**
   * Checks if there is space for text at the specified position
   * @param text - Text to check
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if there is space, false otherwise
   */
  private _hasSpace(text: string, x: number, y: number) {
    return !this.tree.collides(this._calculateArea(text, x, y));
  }

  /**
   * Calculates the area needed for text placement
   * @param text - Text to calculate area for
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param margin - Optional margin
   * @returns Bounding box for the text
   */
  private _calculateArea(
    text: string,
    x: number,
    y: number,
    margin: number = 0,
  ): LabelBounds {
    return {
      minX: x - margin,
      minY: y - margin / 2,
      maxX: x + margin + stringWidth(text),
      maxY: y + margin / 2,
    };
  }
}

export default LabelBuffer;

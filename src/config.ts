/**
 * MapSCII Configuration
 * This file contains all configurable settings for the MapSCII application.
 */
const config = {
  /** UI language for labels and interface elements */
  language: 'en',

  /**
   * Base URL for tile data source
   * @todo adapt to osm2vectortiles successor openmaptiles v3
   * mapscii.me hosts the last available version, 2016-06-20
   */
  source: 'http://mapscii.me/',

  /** Alternate local MBTiles source (commented out by default) */
  //source: __dirname+"/../mbtiles/regensburg.mbtiles",

  /** Path to the map style JSON file defining visual appearance */
  styleFile: new URL('../styles/dark.json', import.meta.url).pathname,

  /** Initial zoom level (null means auto-determined) */
  initialZoom: null,
  /** Maximum allowed zoom level */
  maxZoom: 18,
  /** Step size for zoom operations */
  zoomStep: 0.2,

  /**
   * Initial latitude coordinate
   * @default 52.51298 (Berlin)
   */
  initialLat: 52.51298,
  /**
   * Initial longitude coordinate
   * @default 13.42012 (Berlin)
   */
  initialLon: 13.42012,

  /** Whether to simplify polyline rendering for performance */
  simplifyPolylines: false,

  /** Use Braille characters for rendering (enhances resolution) */
  useBraille: true,

  /** Whether to cache downloaded tiles to ~/.mapscii */
  persistDownloadedTiles: true,

  /** Number of tiles to load around the current view */
  tileRange: 14,

  /** Base size for projection calculations */
  projectSize: 256,

  /** Default margin for labels in pixels */
  labelMargin: 5,

  /**
   * Layer-specific configurations for different map elements
   */
  layers: {
    /** House number label configuration */
    housenum_label: {
      /** Margin around house number labels */
      margin: 4,
    },
    /** Points of interest label configuration */
    poi_label: {
      /** Whether to cluster nearby POIs */
      cluster: true,
      /** Margin around POI labels */
      margin: 5,
    },
    /** Place name label configuration */
    place_label: {
      /** Whether to cluster nearby place labels */
      cluster: true,
    },
    /** State/region label configuration */
    state_label: {
      /** Whether to cluster nearby state labels */
      cluster: true,
    },
  },

  /** Input stream for terminal interaction */
  input: process.stdin,

  /** Output stream for terminal rendering */
  output: process.stdout,

  /**
   * Whether to run in headless mode (no UI)
   */
  headless: false,

  /**
   * Line delimiter for terminal output
   */
  delimeter: '\n\r',

  /**
   * Character used to mark points of interest on the map
   */
  poiMarker: '◉',
};

export default config;

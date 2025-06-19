
// This file is used to declare modules for dependencies that don't have official TypeScript typings.
// For example:
// declare module 'some-library-without-types';

declare module 'potpack' {
  interface Box {
    w: number;
    h: number;
    x?: number;
    y?: number;
    [key: string]: any; // Allow other properties to be attached
  }
  interface Stats {
    w: number; // width of overall bounding box
    h: number; // height of overall bounding box
    fill: number; // percentage of space filled
  }
  function potpack(boxes: Box[]): Stats;
  export = potpack;
}

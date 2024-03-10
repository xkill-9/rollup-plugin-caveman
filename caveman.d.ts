declare module 'caveman' {
  export as namespace Caveman;

  export interface CavemanOptions {
    escapeByDefault: boolean;
    openTag: string;
    closeTag: string;
    shrinkWrap: boolean;
  }

  export const options: CavemanOptions;
  export function compile(template: string): string;
}

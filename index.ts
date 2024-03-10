import Caveman from 'caveman';
import { readFile } from 'fs/promises';
import type { Plugin } from 'rollup';
import { FilterPattern, createFilter } from '@rollup/pluginutils';
import { extname } from 'path';

function containsDirectives(content: string) {
  return content.includes(Caveman.options.openTag);
}

function emitCaveman(content: string) {
  const compiled = Caveman.compile(content);
  return `
    import Caveman from "caveman" 

    export function render(d = {}) {
        ${compiled}
    }

    export default { render };
  `;
}

function emitString(content: string) {
  // Deliberately don't escape further; we're emulating Caveman escapeText function.
  const compiled = content.replace(/'/g, "\\'").replace(/\n/g, '');

  return `
    export function render() {
        return '${compiled}';
    }

    export default { render };
  `;
}

type RollupCavemanOptions = {
  /**
   * A picomatch pattern, or array of patterns, of files that should be
   * processed by this plugin (if omitted, all files are included by default)
   */
  include?: FilterPattern;
  /**
   * Files that should be excluded, if `include` is otherwise too permissive.
   */
  exclude?: FilterPattern;
};

export default function caveman({
  include = '**/*.html?caveman',
  exclude,
}: RollupCavemanOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  return {
    name: 'caveman',

    async resolveId(id, importer) {
      const extension = extname(id);
      if (!extension.includes('.html')) return null;

      // Grab postfix if present. eg: ?caveman.
      const postfix = id.match(postfixRE)?.[0] ?? '';
      // Remove postfix if present and resolve file.
      const filePath = id.replace(postfixRE, '');
      const result = await this.resolve(filePath, importer);

      if (!result) return result;

      // Add the postfix back so that is picked up by our load function.
      return result.id + postfix;
    },

    async load(id) {
      if (!filter(id)) return;

      const filePath = id.replace(postfixRE, '');
      const code = await readFile(filePath, 'utf8');

      const hasDirectives = containsDirectives(code);
      if (!hasDirectives) {
        return {
          code: emitString(code),
          map: { mappings: '' },
        };
      }

      const compiled = emitCaveman(code);
      return {
        code: compiled,
        map: { mappings: '' },
      };
    },
  };
}

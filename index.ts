import camelCase from 'lodash.camelcase';
import { access, readFile } from 'fs/promises';
import type { Plugin } from 'rollup';
import { FilterPattern, createFilter } from '@rollup/pluginutils';
import { dirname, extname, join } from 'path';

// Lazy load caveman
function loadCaveman() {
  return require('caveman');
}

function toES6Module(content: string) {
  return `
    import Caveman from "caveman" 

    export function render(d = {}) {
        ${content}
    }

    export default { render };
  `;
}

/**
 * Resolves a path if it exists.
 */
async function getValidPath(path: string) {
  await access(path);
  return path;
}

/**
 * Return the first path that resolves for the given file.
 */
function getPartialPath(fileName: string, paths: string[]) {
  return Promise.any(paths.map((path) => getValidPath(join(path, fileName))));
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
  /**
   * A list of paths to search for partials in case they're not located in the same directory as the template.
   */
  partialPaths?: string[];
};

export default function caveman({
  include = '**/*.html?caveman',
  exclude,
  partialPaths = [],
}: RollupCavemanOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;
  const partialNameMap = new Map();
  const partialPathCache = new Map();

  return {
    name: 'caveman',

    async resolveId(id, importer) {
      const extension = extname(id);
      if (!extension.includes('.html')) return null;

      // Grab postfix if present. Default is ?caveman.
      const postfix = id.match(postfixRE)?.[0] ?? '';
      // Remove postfix if present and resolve file.
      const filePath = id.replace(postfixRE, '');
      const result = await this.resolve(filePath, importer);

      if (!result) return result;

      // We need to add the postfix back so that the file is picked up by the load function.
      return result.id + postfix;
    },

    async load(id) {
      // Remove postfix if present.
      const filePath = id.replace(postfixRE, '');
      const extension = extname(filePath);

      if (extension !== '.html' || !filter(id)) return;

      const code = await readFile(filePath, 'utf8');

      const cavemanLib = await loadCaveman();
      let compiled = toES6Module(cavemanLib.compile(code));
      const hasPartials = /\b_Cr\('/.test(compiled);

      if (!hasPartials) {
        return {
          code: compiled,
          map: { mappings: '' },
        };
      }

      // Captures partial names from Caveman's render macro calls and replaces it with a call to the partial module's render function.
      // eg: _Cr('my-partial', d) => myPartial.render( d)
      // Caveman's render macro: https://github.com/andrewchilds/caveman/blob/master/caveman.js#L299C18-L299C20
      compiled = compiled.replace(
        /\b_Cr\('([^']+)',/g,
        (match, partialName) => {
          if (!partialName) return match;

          const importName = camelCase(partialName);
          partialNameMap.set(partialName, importName);

          return `${importName}.render(`;
        },
      );

      // Grab postfix if present. Default is ?caveman
      const postfix = id.match(postfixRE)?.[0] ?? '';
      const partialLookupPaths = [
        dirname(filePath), // Always look for partials in the same directory as the template
        ...partialPaths,
      ];
      let partialImports: string[] = [];
      try {
        partialImports = await Promise.all(
          Array.from(partialNameMap, async ([partialName, importName]) => {
            let partialPath = partialPathCache.get(partialName);

            if (!partialPath) {
              partialPath = await getPartialPath(
                partialName + extension,
                partialLookupPaths,
              );
              partialPathCache.set(partialName, partialPath);
            }

            // We need to add the postfix back so partials are also processed by the plugin.
            return `import ${importName} from "${partialPath}${postfix}"`;
          }),
        );
      } catch (e) {
        this.error({ message: 'Unable to find caveman partial', cause: e });
      }

      const importBlock = partialImports.join('\n\n');
      let output = importBlock + '\n\n' + compiled;

      return {
        code: output,
        map: { mappings: '' },
      };
    },
  };
}

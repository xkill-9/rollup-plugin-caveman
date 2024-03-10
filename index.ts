import Caveman from 'caveman';
import { access, readFile } from 'fs/promises';
import type { Plugin } from 'rollup';
import { FilterPattern, createFilter } from '@rollup/pluginutils';
import { dirname, extname, join } from 'path';

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

function toCamelCase(name: string) {
  if (!name) return '';

  // E.g.: icon-bar-chart => IconBarChart
  return (
    name[0]?.toUpperCase() +
    name.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase())
  );
}

async function getValidPath(path: string) {
  await access(path);
  return path;
}

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

      let compiled = emitCaveman(code);
      const hasPartials = /\b_Cr\('/.test(compiled);

      if (!hasPartials) {
        return {
          code: compiled,
          map: { mappings: '' },
        };
      }

      compiled = compiled.replace(
        /\b_Cr\('([^']+)',/g,
        (match, partialName) => {
          if (!partialName) return match;

          const importName = `${toCamelCase(partialName)}Template`;
          partialNameMap.set(partialName, importName);

          return `${importName}.render(`;
        },
      );

      const extension = extname(filePath);
      const postfix = id.match(postfixRE)?.[0] ?? '';
      const partialLookupPaths = [
        dirname(filePath), // Always look for partials in the same directory as the template
        ...partialPaths,
      ];
      let partialImports: string[] = [];
      try {
        partialImports = await Promise.all(
          Array.from(partialNameMap, async ([partialName, importName]) => {
            const partialPath =
              partialPathCache.get(partialName) ??
              (await getPartialPath(
                partialName + extension,
                partialLookupPaths,
              ));

            partialPathCache.set(partialName, partialPath);

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

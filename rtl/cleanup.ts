import { API, FileInfo } from 'jscodeshift';
import { withHelpers } from './helpers';

const HELPER_FUNCTIONS = [
  'normalizeProps',
  'normalizeAttribute'
];

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  HELPER_FUNCTIONS.forEach(fn => {
    if (!root.findCallExpressions(fn).length) {
      root.findFunctionDeclarations(fn).remove();
    }
  });

  // clean up lodash/toLower and lodash/words if they're not used
  root.findImportDeclarationsBySource('lodash')
    .forEach(path => {
      const specifiers = (path.node.specifiers || [])
        .filter(specifier => {
          if (specifier.type === 'ImportSpecifier') {
            const fn = specifier?.local?.name || specifier.imported.name;
            if (!root.findCallExpressions(fn).length &&
              !root.findCallExpressionProperties(fn).length &&
              !root.findIdentifiers(fn).length) {
              return false;
            }
          }
          return true;
        });

      if (!specifiers.length) {
        path.replace();
      }
      else {
        path.node.specifiers = specifiers;
      }
    });

  return root.toSource({ quote: 'single' });
}

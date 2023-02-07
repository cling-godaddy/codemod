import { API, FileInfo } from 'jscodeshift';

const HELPER_FUNCTIONS = [
  'normalizeProps',
  'normalizeAttributes'
];

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // clean up helper functions if they're not used
  function isFunctionUsed(name: string) {
    return !!root
      .find(j.CallExpression, {
        callee: {
          name
        }
      })
      .length;
  }

  HELPER_FUNCTIONS.forEach(fn => {
    if (!isFunctionUsed(fn)) {
      root
        .find(j.FunctionDeclaration, {
          id: {
            name: fn
          }
        })
        .remove();
    }
  })

  return root.toSource({ quote: 'single' });
}

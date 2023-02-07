import { API, FileInfo } from 'jscodeshift';
import { isFunctionUsed } from './utils/functions';

const HELPER_FUNCTIONS = [
  'normalizeProps',
  'normalizeAttributes'
];

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  HELPER_FUNCTIONS.forEach(fn => {
    if (!isFunctionUsed(file, api, fn)) {
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

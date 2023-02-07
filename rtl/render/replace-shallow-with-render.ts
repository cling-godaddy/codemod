import { API, FileInfo } from 'jscodeshift';
import { withHelpers } from '../helpers';
import { Specifier } from '../types';

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  const enzymeImports = root.findImportDeclarationsBySource('enzyme');
  if (!enzymeImports.length) {
    console.log('no enzyme imports found: ' + file.path);
    return;
  }

  let shallowIdentifier, mountIdentifier;
  enzymeImports
    .forEach(path => {
      const specifiers = path.node.specifiers || [];
      specifiers.forEach(specifier => {
        if (specifier.type === 'ImportSpecifier') {
          if (specifier.imported.name === 'shallow') {
            shallowIdentifier = specifier.local?.name || specifier.imported.name;
          }
        }
      })
    });

  enzymeImports
    .forEach(path => {
      const specifiers = path.node.specifiers || [];
      specifiers.forEach(specifier => {
        if (specifier.type === 'ImportSpecifier') {
          if (specifier.imported.name === 'mount') {
            mountIdentifier = specifier.local?.name || specifier.imported.name;
          }
        }
      })
    });

  // TODO(cling) handle mounts
  if (!shallowIdentifier && !mountIdentifier) {
    throw new Error('no shallow/mount imports found: ' + file.path);
  }

  // any functions named 'render'?
  const renderExists = !!root.find(j.VariableDeclarator, { id: { name: 'render' } }).length
    || !!root.find(j.FunctionDeclaration, { id: { name: 'render' } }).length;
  const rtlRenderIdentifier = renderExists ? 'rtlRender' : 'render';

  enzymeImports
    .forEach(path => {
      const newSpecifiers: Specifier[] = [];
      const specifiers = path.node.specifiers || [];
      specifiers.forEach(specifier => {
        if (specifier.type !== 'ImportSpecifier' || !['shallow', 'mount'].includes(specifier.imported.name)) {
          newSpecifiers.push(specifier);
        }
      });

      newSpecifiers.push(j.importSpecifier(j.identifier('render'), j.identifier(rtlRenderIdentifier)));
      path.node.specifiers = newSpecifiers;
      path.node.source = j.stringLiteral('@testing-library/react');
    })
    .sortByImportedName();

  // replace shallow() with render()
  [shallowIdentifier, mountIdentifier].forEach(identifier => {
    if (identifier) {
      root
        .findCallExpressions(identifier)
        .forEach(path => {
          path.node.callee = j.identifier(rtlRenderIdentifier);
        });
    }
  });

  return root.toSource({ quote: 'single' });
}

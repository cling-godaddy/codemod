import { API, FileInfo, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier } from 'jscodeshift';

type Specifier = ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier;

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const enzymeImports = root
    .find(j.ImportDeclaration, {
      source: {
        value: 'enzyme'
      }
    });

  if (!enzymeImports.length) {
    console.log('no enzyme imports found: ' + file.path);
    return;
  }

  let shallowIdentifier;
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

  if (!shallowIdentifier) {
    throw new Error('no shallow import found: ' + file.path);
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
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.name !== 'shallow') {
          newSpecifiers.push(specifier);
        }
      })

      newSpecifiers.push(j.importSpecifier(j.identifier('render'), j.identifier(rtlRenderIdentifier)));

      path.node.specifiers = newSpecifiers;
      path.node.source = j.stringLiteral('@testing-library/react');
    });

  // replace shallow() with render()
  root
    .find(j.CallExpression, {
      callee: {
        name: shallowIdentifier
      }
    })
    .forEach(path => {
      path.node.callee = j.identifier(rtlRenderIdentifier);
    });

  return root.toSource({ quote: 'single' });
}

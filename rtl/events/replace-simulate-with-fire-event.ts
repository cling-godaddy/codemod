import { API, FileInfo, Identifier, ImportSpecifier, Literal, MemberExpression } from 'jscodeshift';
import { createEvent } from '../utils/builders';

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // ensure we have createEvent and fireEvent imported
  const importsToAdd = new Set(['createEvent', 'fireEvent'])
  const isRtlImported = !!root
    .find(j.ImportDeclaration, {
      source: {
        value: '@testing-library/react'
      }
    })
    .length;

  if (isRtlImported) {
    root
      .find(j.ImportDeclaration, {
        source: {
          value: '@testing-library/react'
        }
      })
      .forEach(path => {
        const specifiers = path.node.specifiers || [];
        specifiers.forEach(specifier => {
          const name = (specifier as ImportSpecifier).imported.name;
          if (importsToAdd.has(name)) {
            importsToAdd.delete(name)
          }
        });

        importsToAdd.forEach(name => specifiers.push(j.importSpecifier(j.identifier(name))))
      });
  }
  else {
    root
      .find(j.ImportDeclaration)
      .filter((_, i) => i === 0)
      .insertBefore(j.importDeclaration(
        Array.from(importsToAdd).map((name: string) => j.importSpecifier(j.identifier(name))),
        j.stringLiteral('@testing-library/react')
      ));
  }

  root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'simulate'
        }
      }
    })
    .forEach(path => {
      const eventName = (path.node.arguments[0] as Literal).value;
      const object = (path.node.callee as MemberExpression).object;

      switch (eventName) {
        case 'click':
          const clickEventDeclaration = j.variableDeclaration(
            'const',
            [
              j.variableDeclarator(
                j.identifier('clickEvent'),
                createEvent(j, 'click', object, {
                  bubbles: true,
                  cancelable: true
                })
              )
            ]
          );

          path.parentPath.insertBefore(clickEventDeclaration)
          path.replace(
            j.callExpression(
              j.identifier('fireEvent'),
              [
                object,
                j.identifier('clickEvent')
              ]
            )
          );
          break;

        case 'keydown':
          const keyDownEventDeclaration = j.variableDeclaration(
            'const',
            [
              j.variableDeclarator(
                j.identifier('keyDownEvent'),
                createEvent(j, 'keyDown', object, path.node.arguments[1])
              )
            ]
          );
          path.parentPath.insertBefore(keyDownEventDeclaration)
          path.replace(
            j.callExpression(
              j.identifier('fireEvent'),
              [
                object,
                j.identifier('keyDownEvent')
              ]
            )
          );
          break;

        default:
          break;
      }
    });

  // handle assert preventDefault
  // TODO(cling)
  // closest() might be usable here to transform expect(preventDefault)
  // but until that's figured out, just comment out these assertions
  root
    .find(j.CallExpression, {
      callee: {
        name: 'expect'
      }
    })
    .filter(path => (path.node.arguments[0] as Identifier)?.name === 'preventDefault')
    .forEach(path => {
      // TODO(cling) hack to comment a line
      path.get('callee').replace(j.identifier('// expect'))
    })

  return root.toSource({ quote: 'single' });
}

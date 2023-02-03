import { API, FileInfo, ImportSpecifier, Literal, MemberExpression } from 'jscodeshift';

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
                j.memberExpression(
                  j.identifier('createEvent'),
                  j.callExpression(
                    j.identifier('click'),
                    [
                      object,
                      j.objectExpression([
                        j.objectProperty(j.identifier('bubbles'), j.booleanLiteral(true)),
                        j.objectProperty(j.identifier('cancelable'), j.booleanLiteral(true))
                      ])
                    ]
                  )
                )
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

          break;

        default:
          break;
      }
    })

  return root.toSource({ quote: 'single' });
}

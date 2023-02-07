import { API, FileInfo, Identifier, ImportSpecifier, Literal, MemberExpression } from 'jscodeshift';
import { withHelpers } from '../helpers';
import { createEvent } from '../utils/builders';
import { makeComment } from '../utils/comments';

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  // if no simulate(), no work needed
  const isSimulateUsed = !!root.find(j.MemberExpression, {
    property: {
      name: 'simulate'
    }
  }).length;
  if (!isSimulateUsed) {
    return root.toSource({ quote: 'single' });
  }

  // ensure we have createEvent and fireEvent imported
  const importsToAdd = new Set(['createEvent', 'fireEvent'])
  const isRtlImported = !!root.findImportDeclarationsBySource('@testing-library/react').length;

  if (isRtlImported) {
    root
      .findImportDeclarationsBySource('@testing-library/react')
      .forEach(path => {
        const specifiers = path.node.specifiers || [];
        specifiers.forEach(specifier => {
          const name = (specifier as ImportSpecifier).imported.name;
          if (importsToAdd.has(name)) {
            importsToAdd.delete(name)
          }
        });

        importsToAdd.forEach(name => specifiers.push(j.importSpecifier(j.identifier(name))))
      })
      .sortByImportedName();
  }
  else {
    root
      .find(j.ImportDeclaration)
      .filter((_, i) => i === 0)
      .insertBefore(j.importDeclaration(
        Array.from(importsToAdd).map((name: string) => j.importSpecifier(j.identifier(name))),
        j.stringLiteral('@testing-library/react')
      ))
      .sortByImportedName();
  }

  root
    .findCallExpressionProperties('simulate')
    .forEach(path => {
      const eventName = (path.node.arguments[0] as Literal).value;
      const object = (path.node.callee as MemberExpression).object;
      console.log(object)

      // if object is the same as 'wrapper', a.k.a. the result of render(), it's a not an Element,
      // so we need to call wrapper.container.children[0] instead to get the top level Element
      const target = object.type === 'Identifier' && object.name === 'wrapper'
        ? j.memberExpression(
          j.identifier('wrapper'),
          j.memberExpression(
            j.identifier('container'),
            j.memberExpression(
              j.identifier('children'),
              j.literal(0)
            ),
            false
          ),
          false
        ) : object;

      switch (eventName) {
        case 'click':
          const clickEventDeclaration = j.variableDeclaration(
            'const',
            [
              j.variableDeclarator(
                j.identifier('clickEvent'),
                createEvent(j, 'click', target, {
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
                target,
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
                createEvent(j, 'keyDown', target, path.node.arguments[1])
              )
            ]
          );
          path.parentPath.insertBefore(keyDownEventDeclaration)
          path.replace(
            j.callExpression(
              j.identifier('fireEvent'),
              [
                target,
                j.identifier('keyDownEvent')
              ]
            )
          );
          break;

        default:
          break;
      }
    });

  root
    .commentAssertions(path => (path.node.arguments[0] as Identifier)?.name === 'preventDefault')
    .insertCommentBeforeTest(makeComment('commented out expect(preventDefault)'));

  return root.toSource({ quote: 'single' });
}

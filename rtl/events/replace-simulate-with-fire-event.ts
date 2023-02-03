import { API, CallExpression, FileInfo, Literal, MemberExpression } from 'jscodeshift';

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    // .find(j.ExpressionStatement, {
    //   expression: {
    //     callee: {
    //       property: {
    //         name: 'simulate'
    //       }
    //     }
    //   }
    // })

    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'simulate'
        }
      }
    })
    .forEach(path => {
      const eventName = (path.node.arguments[0] as Literal).value;
      // console.log(path.node.callee);
      // console.log(path.node.callee.object);
      const object = (path.node.callee as MemberExpression).object;

      // const object = (path.node.expression as CallExpression).callee.object

      // const callee = path.node.callee;
      // console.log({ eventName})
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

          path.replace()
          // path.replace(clickEventDeclaration)
          // path.insertBefore(clickEventDeclaration)
          // path.unshift(clickEventDeclaration)

          // path.replace(
          //   j.callExpression(
          //     j.identifier('fireEvent'),
          //     [object, j.newExpression(
          //       j.identifier('MouseEvent'),
          //       [
          //         j.objectExpression([
          //           j.objectProperty(j.identifier('bubbles'), j.booleanLiteral(true)),
          //           j.objectProperty(j.identifier('cancelable'), j.booleanLiteral(true))
          //         ])
          //       ]
          //     )]
          //   )
          // )
          break;

        case 'keydown':

          break;

        default:
          break;
      }
    })

  return root.toSource({ quote: 'single' });
}

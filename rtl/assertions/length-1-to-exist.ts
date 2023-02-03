import { API, FileInfo, Literal, MemberExpression } from 'jscodeshift';

// Change expect(foo).to.have.length(1) to expect(foo).to.exist;
export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.CallExpression, {
    callee: {
      object: {
        object: {
          object: {
            callee: {
              name: "expect"
            }
          },

          property: {
            name: "to"
          }
        },

        property: {
          name: "have"
        }
      },

      property: {
        name: "length"
      }
    }
  })
    .filter(path => (path.node?.arguments?.[0] as Literal)?.value === 1)
    .replaceWith(path => {
      return j.memberExpression(
        (path.node.callee as MemberExpression).object,
        j.identifier('exist')
      );
    });

  return root.toSource({ quote: 'single' });
}


import { API, FileInfo, Literal } from 'jscodeshift';

// Change .prop() assertions on enzyme wrappers to .getAttribute()
// Prerequisites:
// Ran "add-helper-functions" to write normalizeAttribute()
export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'prop'
        }
      }
    })
    .forEach(path => {
      path.get('callee').get('property').replace(
        j.identifier('getAttribute')
      );

      // should only be one arg of type string
      const arg = String((path.node.arguments[0] as Literal).value);
      path.node.arguments = [j.callExpression(
        j.identifier('normalizeAttribute'),
        [j.stringLiteral(arg)]
      )]
    });

  return root.toSource({ quote: 'single' });
}


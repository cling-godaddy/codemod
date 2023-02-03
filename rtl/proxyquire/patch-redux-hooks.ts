import { API, FileInfo, Identifier, ObjectExpression, Property } from 'jscodeshift';

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  let pqName;
  root
    .find(j.ImportDeclaration, {
      source: {
        value: 'proxyquire'
      }
    })
    .forEach(path => {
      const specifiers = path.node.specifiers || [];
      if (specifiers.length > 1 || specifiers[0].type !== 'ImportDefaultSpecifier') {
        // TODO(cling)
        throw new Error('unable to parse proxyquire import: ' + file.path)
      }
      pqName = specifiers[0].local!.name;
    })

  // ensure PQ is actually used
  if (!root.find(j.CallExpression, { callee: { name: pqName } }).length) {
    // TODO(cling)
    throw new Error('proxyquire is imported but not used: ' + file.path);
  }

  root
    .find(j.CallExpression, {
      callee: {
        name: pqName
      }
    })
    .forEach(path => {
      const stubs = path.node.arguments[1] as ObjectExpression;
      (stubs.properties as Property[]).forEach(property => {
        if (property.key.type === 'Literal' && property.key.value === 'react-redux') {
          const reduxProperties = (property.value as ObjectExpression).properties as Property[];
          reduxProperties
            .forEach(prop => {
              // what to check for?
              // useDipatch can't be a stub() without a return value
              if ((prop.key as Identifier).name === 'useDispatch') {
                if (prop.value.type === 'CallExpression' && prop.value.callee.type !== 'MemberExpression') {
                  prop.value.callee = j.memberExpression(
                    j.callExpression(prop.value.callee, prop.value.arguments),
                    j.identifier('returns')
                  )
                  prop.value.arguments = [j.callExpression(j.identifier('stub'), [])]
                }
              }
            })
        }
      })
    })

  return root.toSource({ quote: 'single' });
}

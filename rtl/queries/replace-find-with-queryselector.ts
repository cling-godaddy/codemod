import { API, FileInfo } from 'jscodeshift';
import { isComponentName } from '../utils/selectors';

export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'find'
        }
      }
    })
    .forEach(path => {
      // TODO(cling) handle compound selectors
      const args = path.node.arguments;
      if (args.length === 1 && args[0].type === 'Literal' && isComponentName(args[0]?.value + '')) {
        const componentName = String(args[0].value);
        path.get('callee').get('property').replace(
          j.memberExpression(
            j.identifier('container'),
            j.identifier('querySelector')
          )
        );

        path.node.arguments = [j.stringLiteral(`[data-aid="${componentName}"]`)]
      }
    })

  return root.toSource({ quote: 'single' });
}

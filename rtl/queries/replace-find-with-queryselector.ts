import { API, FileInfo } from 'jscodeshift';
import { withHelpers } from '../helpers';
import { isComponentName } from '../utils/selectors';

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  root
    .findCallExpressionProperties('find')
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

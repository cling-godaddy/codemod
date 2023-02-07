import { API, ASTPath, CallExpression, FileInfo, Identifier, Literal, MemberExpression } from 'jscodeshift';
import { withHelpers } from '../helpers';
import { isEventHandlerName } from '../utils/selectors';

// TODO(cling) clean this up
function isBooleanAssertion(path: ASTPath<CallExpression | MemberExpression>) {
  let currPath: ASTPath<CallExpression | MemberExpression> = path;
  while (currPath.parentPath && ((currPath.node as MemberExpression)?.property as Identifier)?.name !== 'to') {
    currPath = currPath.parentPath;
  }
  let finalAssertion: ASTPath<CallExpression | MemberExpression> = currPath.parentPath;
  while (((finalAssertion.node as MemberExpression)?.property as Identifier)?.name === 'be') {
    finalAssertion = finalAssertion.parentPath;
  }
  return ['true', 'false'].includes(((finalAssertion.node as MemberExpression)?.property as Identifier)?.name);
}

// Change .prop() assertions on enzyme wrappers to .getAttribute()
// Prerequisites:
// Ran "add-helper-functions" to write normalizeAttribute()
export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  // .prop('foo')
  root
    .findCallExpressionProperties('prop')
    .forEach(path => {
      path.get('callee').get('property').replace(
        j.identifier(isBooleanAssertion(path) ? 'hasAttribute' : 'getAttribute')
      );

      // should only be one arg of type string
      const arg = String((path.node.arguments[0] as Literal).value);
      path.node.arguments = [j.callExpression(
        j.identifier('normalizeAttribute'),
        [j.stringLiteral(arg)]
      )]
    });

  // .props().foo
  root
    .findCallExpressionProperties('props')
    .filter(path => isEventHandlerName(path.parentPath.node.property.name))
    .insertCommentBeforeTest('skipped because it calls a prop handler', true);

  root
    .findCallExpressionProperties('props')
    .forEach((path: ASTPath<CallExpression | MemberExpression>) => {
      const prop = path.parentPath.node.property.name;
      if (!isEventHandlerName(prop)) {
        if (path.parentPath.node.type === 'MemberExpression') {
          const attr = path.parentPath.node.property.name;

          path.parentPath.parentPath.node.arguments = [
            j.memberExpression(
              (path.node as any).callee.object,
              j.callExpression(
                j.identifier(isBooleanAssertion(path) ? 'hasAttribute' : 'getAttribute'),
                [
                  j.callExpression(j.identifier('normalizeAttribute'), [
                    j.stringLiteral(attr)
                  ])
                ]
              )
            )
          ]
        }
      }
    });

  return root.toSource({ quote: 'single' });
}


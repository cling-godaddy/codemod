import { API, FileInfo, Literal } from 'jscodeshift';
import { withHelpers } from './helpers';
import { isEventHandlerName } from './utils/selectors';

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  // prop('onChange')
  root
    .findCallExpressionProperties('prop')
    .filter(path => isEventHandlerName(String((path.node.arguments[0] as Literal)?.value)))
    .insertCommentBeforeTest(`skipped: called prop on an event handler`, true);

  // inline require()
  root
    .findCallExpressions('require')
    .insertCommentBeforeTest(`skipped: inline require()'`, true);

  return root.toSource({ quote: 'single' });
}

import { API, FileInfo } from 'jscodeshift';
import { withHelpers } from '../helpers';

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);

  root
    .findCallExpressionProperties('text')
    .renameProperty('textContent');

  return root.toSource({ quote: 'single' });
}

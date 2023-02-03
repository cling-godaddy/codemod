import { camelCase, upperFirst } from 'lodash';

export function isComponentName(selector: string): boolean {
  // TODO(cling)
  // handle multiple component name selectors?
  // e.g. wrapper.find('Component SubComponent)
  return upperFirst(camelCase(selector)) === selector;
}

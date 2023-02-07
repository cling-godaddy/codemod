import { camelCase, upperFirst, words } from 'lodash';

export function isComponentName(selector: string): boolean {
  // TODO(cling)
  // handle multiple component name selectors?
  // e.g. wrapper.find('Component SubComponent)
  return upperFirst(camelCase(selector)) === selector;
}

export function isEventHandlerName(prop: string): boolean {
  const tokens = words(prop);
  return tokens.length > 1 && ['on', 'handle'].includes(tokens[0]);
}

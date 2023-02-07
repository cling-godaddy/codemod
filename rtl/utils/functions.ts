import { API, FileInfo } from "jscodeshift";

export function isFunctionUsed(file: FileInfo, api: API, fn: string) {
  const j = api.jscodeshift;
  const root = j(file.source);

  return !!root
    .find(j.CallExpression, {
      callee: {
        name: fn
      }
    })
    .length;
}

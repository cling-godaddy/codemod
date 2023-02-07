import { accessSync, constants, readFileSync } from 'fs';
import { API, FileInfo } from 'jscodeshift';

import { isComponentName } from '../utils/selectors';

function getSourceFilePath(currentFile: FileInfo): string {
  // TODO(cling)
  // if .find() calls the literal Components, we can use the imported path in this file instead of guessing
  // see if we can find the file in /src
  const pathTokens = currentFile.path.split('/');
  const fileName = pathTokens.at(-1)?.split('.')[0];
  const rootDir = pathTokens.slice(0, pathTokens.findIndex(t => t === 'test')).join('/')

  const baseDir = [rootDir, 'src', ...pathTokens.slice(pathTokens.findIndex(t => t === 'client'), pathTokens.length - 1)].join('/');
  const possibleSourceFiles = [
    [baseDir, fileName + '.js'].join('/'),
    [baseDir, 'index.js'].join('/')
  ];

  let sourceFile;
  const sourceFileExists = possibleSourceFiles.some(path => {
    try {
      accessSync(path, constants.F_OK);
      sourceFile = path;
      return true;
    } catch (err) {
      return false;
    }
  });

  if (!sourceFileExists || !sourceFile) {
    throw new Error('no source file found for: ' + currentFile.path);
  }

  return sourceFile;
}

export const parser = 'flow';
export default function (file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const componentName = file.path.split('/').at(-1)?.split('.')[0]!;
  let pqName;

  // ensure proxyquire is imported
  if (!root.find(
    j.ImportDeclaration,
    {
      source: {
        value: 'proxyquire'
      }
    }).length
  ) {
    // TODO(cling) if the query targets only refer to styled components, this may not be needed
    // no proxyquire declaration; add it

    // remove the existing Component import
    let relativePath: string;
    root
      .find(j.ImportDeclaration)
      .filter(path => {
        const specifiers = path.node.specifiers || [];
        return !!specifiers.length && Boolean(specifiers.some(specifier => {
          return specifier.type === 'ImportDefaultSpecifier' && specifier.local?.name === componentName
        }));
      })
      .forEach(path => {
        relativePath = String(path.node.source.value);
        path.replace();
      })

    root.get().node.program.body.unshift(
      j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('proxyquire'))],
        j.stringLiteral('proxyquire')
      )
    );
    pqName = 'proxyquire';

    // insert the proxyquire stub into the body of the top level block
    root
      .find(j.CallExpression, {
        callee: {
          name: 'describe'
        }
      })
      .get(0).node.arguments[1].body.body
      .unshift(
        j.variableDeclaration(
          'const',
          [
            j.variableDeclarator(
              j.assignmentPattern(
                j.identifier(componentName),
                j.memberExpression(
                  j.callExpression(
                    j.identifier(pqName),
                    [
                      j.stringLiteral(relativePath!),
                      j.objectExpression([

                      ])
                    ]
                  ),
                  j.identifier('default')
                )
              )
            ),
          ]
        )
      );
  }

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


  // check all instances of .find()
  const queriedComponents = new Set<string>();
  root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'find'
        }
      }
    })
    .forEach(path => {
      const args = path.node.arguments;
      if (args.length === 1 && args[0].type === 'Literal' && isComponentName(args[0]?.value + '')) {
        queriedComponents.add(args[0]?.value + '');
      }
    });

  // find the relative paths in the source file
  const relativePaths: { [component: string]: string } = {}
  const source = j(readFileSync(getSourceFilePath(file), { encoding: 'utf8', flag: 'r' }));
  source
    .find(j.ImportDeclaration)
    .forEach(path => {
      const importPath = String(path.node.source.value);
      queriedComponents.forEach(component => {
        if (importPath.includes(component)) {
          relativePaths[component] = importPath;
        }
      })
    });

  // stub the queried components with proxyquire
  root
    .find(j.CallExpression, {
      callee: {
        name: pqName
      }
    })
    .forEach(path => {
      const args = path.node.arguments;
      if (args.length !== 2 || args[1].type !== 'ObjectExpression') {
        throw new Error('invalid proxyquire expression: ' + file.path);
      }

      const stubs = args[1];
      Object.entries(relativePaths).forEach(([component, relativePath]) => {
        stubs.properties.push(
          j.objectProperty(
            j.stringLiteral(relativePath),
            j.objectExpression([
              j.objectProperty(
                j.identifier('default'),
                j.arrowFunctionExpression(
                  [j.identifier('props')],
                  j.jsxElement(
                    j.jsxOpeningElement.from({
                      name: j.jsxIdentifier('div'),
                      attributes: [
                        j.jsxSpreadAttribute(j.callExpression(j.identifier('normalizeProps'), [j.identifier('props')])),
                        j.jsxAttribute(j.jsxIdentifier('data-aid'), j.stringLiteral(component))
                      ],
                      selfClosing: true
                    })
                  )
                )
              )
            ])
          )
        );
      });
    });

  return root.toSource({ quote: 'single' });
}

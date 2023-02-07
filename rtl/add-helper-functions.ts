import { API, FileInfo, Identifier, Node } from 'jscodeshift';
import { withHelpers } from './helpers';

// Adds the following helper functions to help transformation:

// function normalizeAttribute(attr) {
//   const exceptions = [...];
//   return exceptions.includes(attr) ? attr : ['data'].concat(words(attr).map(toLower)).join('-');
// }

// common Element attributes we don't want to prefix with data-
const ATTRIBUTE_EXCEPTIONS = [
  'alt',
  'class',
  'data-aid',
  'id',
  'src'
];

// function normalizeProps(props) {
//   const result = {};
//   Object.entries(props).map(([key, value]) => {
//     if (typeof value !== 'function') {
//       result[normalizeAttribute(key)] = value
//     }
//   });
//   return result;
// }

// TODO consider specific imports like lodash/get, etc.
const LODASH_MODULES = [
  'lodash'
];

export default function (file: FileInfo, api: API) {
  const j = withHelpers(api.jscodeshift);
  const root = j(file.source);
  const body = root.get().node.program.body;


  function lastImportIndex() {
    return body.findIndex(({ type }: Node) => type !== 'ImportDeclaration');
  }

  function insertAt(index: number, node: Node) {
    body.splice(index, 0, node);
  }

  // insert the import statement
  // import { toLower, words } from 'lodash';
  const lodashIdentifiersMap: { [k: string]: Identifier | null } = {
    toLower: null,
    words: null
  };
  if (
    // no existing lodash import
    !root
      .find(j.ImportDeclaration)
      .some(path => LODASH_MODULES.includes(String(path.node.source.value)))
  ) {
    insertAt(lastImportIndex(), j.importDeclaration(
      [
        j.importSpecifier(j.identifier('toLower')),
        j.importSpecifier(j.identifier('words'))
      ],
      j.stringLiteral('lodash')
    ));

    lodashIdentifiersMap['toLower'] = j.identifier('toLower');
    lodashIdentifiersMap['words'] = j.identifier('words');
  } else {
    // lodash already imported; add "toLower" and "words"
    root
      .find(j.ImportDeclaration, {
        source: {
          value: 'lodash'
        }
      })
      .forEach(path => {
        const specifiers = path.node.specifiers || [];
        specifiers.forEach(specifier => {
          if (specifier.type === 'ImportSpecifier') {
            Object.keys(lodashIdentifiersMap).forEach(name => {
              if (specifier.imported.name === name) {
                lodashIdentifiersMap[name] = j.identifier(specifier.local?.name || specifier.imported.name);
              }
            })
          }
        })

        Object.keys(lodashIdentifiersMap).forEach(name => {
          if (!lodashIdentifiersMap[name]) {
            specifiers.push(j.importSpecifier(j.identifier(name)))
            lodashIdentifiersMap[name] = j.identifier(name);
          }
        });
      })
  }


  // insert the helper functions
  insertAt(lastImportIndex(),
    // function normalizeProps(props)
    j.functionDeclaration(
      j.identifier('normalizeProps'),
      [j.identifier('props')],
      j.blockStatement([
        // const result = {};
        j.variableDeclaration(
          'const',
          [
            j.variableDeclarator(
              j.assignmentPattern(
                j.identifier('result'), j.objectExpression([])
              )
            )
          ]
        ),
        // Object.entries(props).map(([key, value]) => {
        //   if (typeof value !== 'function') {
        //     result[normalizeAttribute(key)] = value
        //   }
        // });
        j.expressionStatement(
          j.memberExpression(
            j.memberExpression(
              j.identifier('Object'),
              j.callExpression(
                j.identifier('entries'),
                [j.identifier('props')]
              )
            ),
            j.callExpression(
              j.identifier('map'),
              [
                j.arrowFunctionExpression(
                  [
                    j.arrayPattern([
                      j.identifier('key'),
                      j.identifier('value')
                    ])
                  ],
                  j.blockStatement([
                    j.ifStatement(
                      j.binaryExpression('===', j.identifier('key'), j.stringLiteral('children')),
                      j.returnStatement(null)
                    ),

                    j.switchStatement(
                      j.unaryExpression('typeof', j.identifier('value')),
                      [
                        j.switchCase(j.stringLiteral('function'), [j.breakStatement()]),
                        j.switchCase(j.stringLiteral('boolean'), [
                          j.ifStatement(
                            j.unaryExpression('!', j.identifier('value')),
                            j.breakStatement()
                          )
                        ]),
                        j.switchCase(null, [
                          j.expressionStatement(
                            j.assignmentExpression(
                              '=',
                              j.memberExpression(
                                j.identifier('result'),
                                j.callExpression(
                                  j.identifier('normalizeAttribute'),
                                  [j.identifier('key')]
                                ),
                                true
                              ),
                              j.identifier('value')
                            )
                          ),
                          j.breakStatement()
                        ])
                      ]
                    )
                  ])
                )
              ]
            )
          )
        ),
        // return result;
        j.returnStatement(j.identifier('result'))
      ])
    )
  )

  insertAt(lastImportIndex(),
    // function normalizeAttribute(attr)
    j.functionDeclaration(
      j.identifier('normalizeAttribute'),
      [j.identifier('attr')],
      j.blockStatement([
        // const exceptions = [...];
        j.variableDeclaration(
          'const',
          [
            j.variableDeclarator(
              j.assignmentPattern(
                j.identifier('exceptions'),
                j.arrayExpression(ATTRIBUTE_EXCEPTIONS.map(attr => j.stringLiteral(attr)))
              )
            )
          ]
        ),
        // return exceptions.includes(attr) ? attr : ['data'].concat(words(attr).map(toLower)).join('-');
        j.returnStatement(
          j.conditionalExpression(
            j.callExpression(
              j.memberExpression(
                j.identifier('exceptions'),
                j.identifier('includes')
              ),
              [j.identifier('attr')]
            ),
            j.identifier('attr'),
            j.memberExpression(
              j.memberExpression(
                j.arrayExpression([j.stringLiteral('data')]),
                j.callExpression(
                  j.identifier('concat'),
                  [
                    j.memberExpression(
                      j.callExpression(
                        lodashIdentifiersMap['words']!,
                        [j.identifier('attr')]
                      ),
                      j.callExpression(
                        j.identifier('map'),
                        [lodashIdentifiersMap['toLower']!],
                      )
                    )
                  ]
                )
              ),
              j.callExpression(
                j.identifier('join'),
                [j.stringLiteral('-')]
              )
            )
          )
        )
      ])
    )
  );

  return root.toSource({ quote: 'single' });
}

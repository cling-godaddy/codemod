import j, { ASTPath, CallExpression, Collection, ImportDeclaration, JSCodeshift, MemberExpression } from 'jscodeshift';
import { once } from 'lodash';
import { Specifier } from './types';
import { makeComment } from './utils/comments';
declare module 'jscodeshift/src/Collection' {
  interface Collection<N> {
    closestItBlock: typeof qol.closestItBlock
    commentAssertions: typeof qol.commentAssertions
    findCallExpressions: typeof qol.findCallExpressions
    findCallExpressionProperties: typeof qol.findCallExpressionProperties
    findFunctionDeclarations: typeof qol.findFunctionDeclarations
    findIdentifiers: typeof qol.findIdentifiers
    findImportDeclarationsBySource: typeof qol.findImportDeclarationsBySource
    insertCommentBeforeTest: typeof qol.insertCommentBeforeTest
    skipTests: typeof qol.skipTests

    renameProperty: typeof callExpressionMethods.renameProperty

    sortByImportedName: typeof importDeclarationMethods.sortByImportedName
  }
};

function skipItBlock(path: ASTPath<CallExpression>) {
  if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'it') {
    path.node.callee.name = 'xit';
  }
}

const qol = {
  closestItBlock() {
    return (this as unknown as Collection<CallExpression>).closest(j.CallExpression, {
      callee: {
        name: 'it'
      }
    })
  },

  commentAssertions(filterCondition: (path: ASTPath<CallExpression>, i: number, paths: Array<ASTPath<CallExpression>>) => boolean, calleeName: string = 'expect') {
    return (this as unknown as Collection<CallExpression>).find(j.CallExpression, {
      callee: {
        name: calleeName
      }
    })
      .filter(filterCondition)
      .forEach(path => {
        // TODO(cling) hack to comment a line
        path.get('callee').replace(j.identifier('// ' + calleeName))
      })
  },

  findCallExpressions(name: string) {
    return (this as unknown as Collection).find(
      j.CallExpression,
      {
        callee: {
          name
        }
      });
  },

  findCallExpressionProperties(name: string) {
    return (this as unknown as Collection).find(
      j.CallExpression, {
      callee: {
        property: {
          name
        }
      }
    })
  },

  findFunctionDeclarations(name: string) {
    return (this as unknown as Collection).find(j.FunctionDeclaration, {
      id: {
        name
      }
    });
  },

  findIdentifiers(name: string) {
    return (this as unknown as Collection).find(j.Identifier, {
      name
    });
  },

  findImportDeclarationsBySource(value: string) {
    return (this as unknown as Collection).find(j.ImportDeclaration, {
      source: {
        value
      }
    })
  },

  insertCommentBeforeTest(comment: string, skipTests: boolean = false) {
    return (this as unknown as Collection<CallExpression>)
      .closestItBlock()
      .forEach(path => {
        path.parentPath.insertBefore('// ' + makeComment(comment));

        if (skipTests) {
          skipItBlock(path);
        }
      });
  },

  skipTests() {
    return (this as unknown as Collection<CallExpression>)
      .closestItBlock()
      .forEach(skipItBlock);
  }
};

const callExpressionMethods = {
  renameProperty(newName: string) {
    return (this as unknown as Collection<CallExpression>).forEach(path => {
      const { callee } = path.node;
      if (callee.type === 'MemberExpression') {
        const { object } = path.node.callee as MemberExpression;
        path.replace(j.memberExpression(object, j.identifier(newName)))
      }
    })
  }
};

const importDeclarationMethods = {
  sortByImportedName() {
    return (this as unknown as Collection<ImportDeclaration>)
      .forEach(path => {
        const specifiers = path.node.specifiers || [];
        specifiers.sort((a: Specifier, b: Specifier) => {
          if (a.type === 'ImportSpecifier' && b.type === 'ImportSpecifier') {
            if (a.imported.name < b.imported.name) return -1;
            if (a.imported.name > b.imported.name) return 1;
          }
          return 0;
        });
      });
  }
};

export const withHelpers = once(function (j: JSCodeshift) {
  j.registerMethods(qol);
  j.registerMethods(importDeclarationMethods, j.ImportDeclaration);
  j.registerMethods(callExpressionMethods, j.CallExpression);
  return j;
});

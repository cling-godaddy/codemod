import { ArrayExpression, ArrowFunctionExpression, AssignmentExpression, AwaitExpression, BigIntLiteral, BinaryExpression, BindExpression, BooleanLiteral, CallExpression, ChainExpression, ClassExpression, ComprehensionExpression, ConditionalExpression, DirectiveLiteral, DoExpression, FunctionExpression, GeneratorExpression, Identifier, Import, ImportExpression, JSCodeshift, JSXElement, JSXExpressionContainer, JSXFragment, JSXIdentifier, JSXMemberExpression, JSXText, Literal, LogicalExpression, MemberExpression, MetaProperty, NewExpression, NullLiteral, NumericLiteral, ObjectExpression, OptionalCallExpression, OptionalMemberExpression, ParenthesizedExpression, PrivateName, RegExpLiteral, SequenceExpression, StringLiteral, Super, TaggedTemplateExpression, TemplateLiteral, ThisExpression, TSAsExpression, TSNonNullExpression, TSTypeAssertion, TSTypeParameter, TypeCastExpression, UnaryExpression, UpdateExpression, YieldExpression } from "jscodeshift";

type ExpressionKind = Identifier |
  FunctionExpression |
  ThisExpression |
  ArrayExpression |
  ObjectExpression |
  Literal |
  SequenceExpression |
  UnaryExpression |
  BinaryExpression |
  AssignmentExpression |
  MemberExpression |
  UpdateExpression |
  LogicalExpression |
  ConditionalExpression |
  NewExpression |
  CallExpression |
  ArrowFunctionExpression |
  YieldExpression |
  GeneratorExpression |
  ComprehensionExpression |
  ClassExpression |
  Super |
  TaggedTemplateExpression |
  TemplateLiteral |
  MetaProperty |
  AwaitExpression |
  ImportExpression |
  ChainExpression |
  OptionalCallExpression |
  OptionalMemberExpression |
  JSXIdentifier |
  JSXExpressionContainer |
  JSXElement |
  JSXFragment |
  JSXMemberExpression |
  JSXText |
  PrivateName |
  TypeCastExpression |
  DoExpression |
  BindExpression |
  ParenthesizedExpression |
  DirectiveLiteral |
  StringLiteral |
  NumericLiteral |
  BigIntLiteral |
  NullLiteral |
  BooleanLiteral |
  RegExpLiteral |
  Import |
  TSAsExpression |
  TSNonNullExpression |
  TSTypeParameter |
  TSTypeAssertion;

function literalize(j: JSCodeshift, value: string | number | boolean | RegExp | null) {
  if (typeof value === 'boolean') {
    return j.booleanLiteral(value);
  }
  if (typeof value === 'number') {
    return j.numericLiteral(value);
  }
  if (typeof value === 'string') {
    return j.stringLiteral(value);
  }
  return j.literal(value);
}

export function createEvent(
  j: JSCodeshift,
  eventName: string,
  domNode: ExpressionKind,
  eventProperties: { [k: string]: any } | ObjectExpression) {
  return j.memberExpression(
    j.identifier('createEvent'),
    j.callExpression(
      j.identifier(eventName),
      [
        domNode,
        //@ts-ignore
        eventProperties?.type === 'ObjectExpression'
          ? eventProperties
          : j.objectExpression(Object.entries(eventProperties).map(([key, value]) => {
            return j.objectProperty(
              j.identifier(key),
              literalize(j, value)
            );
          }))
      ]
    )
  )
}

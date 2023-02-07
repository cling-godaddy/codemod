import { ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier } from "jscodeshift";

export type Specifier = ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier;

// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableInfo } from "../type-graph/variable-info";
import { ModuleScope, PositionedModuleScope } from "../type-graph/module-scope";
import type { TypeScope } from "../type-graph/type-scope";
import type { TypeGraph } from "../type-graph/module-scope";
import type {
  Program,
  SourceLocation,
  ImportSpecifier,
  ImportDeclaration
} from "@babel/parser";

function getImportName(specifier: ImportSpecifier): ?string {
  if (specifier.type === NODE.IMPORT_SPECIFIER) {
    return specifier.imported.name;
  }
  if (specifier.type === NODE.IMPORT_DEFAULT_SPECIFIER) {
    return "default";
  }
  return null;
}

export function importDependencies(
  importNode: ImportDeclaration,
  moduleTypeGraph: ModuleScope,
  currentModuleTypeGraph: ModuleScope | PositionedModuleScope,
  currentModuleTypeScope: TypeScope,
  isTypeDefinitions: boolean
) {
  const { exports, exportsTypes } = moduleTypeGraph;
  const importSource =
    importNode.importKind === "type" || isTypeDefinitions
      ? exportsTypes
      : exports;
  const importTarget =
    importNode.importKind === "type" || isTypeDefinitions
      ? currentModuleTypeScope
      : currentModuleTypeGraph;
  const importEntries = [...importSource.entries()].map(([key, a]) => [
    key,
    a instanceof VariableInfo ? a : new VariableInfo(a)
  ]);
  const withPositions = currentModuleTypeGraph instanceof PositionedModuleScope;
  const shouldBeVariable = importTarget instanceof ModuleScope;
  importNode.specifiers.forEach(specifier => {
    const importName = getImportName(specifier);
    let importElement = importName
      ? importSource.get(importName)
      : ObjectType.term(
          ObjectType.getName(importEntries),
          { typeScope: currentModuleTypeScope },
          importEntries
        );
    if (importElement === undefined) {
      throw new HegelError(
        `Module "${importNode.source.value}" hasn't "${importName ||
          "*"}" export`,
        specifier.loc
      );
    }
    if (
      importElement instanceof ObjectType &&
      importElement.instanceType !== null
    ) {
      currentModuleTypeScope.body.set(importName, importElement.instanceType);
    }
    if (shouldBeVariable && !(importElement instanceof VariableInfo)) {
      importElement = new VariableInfo(
        importElement,
        // $FlowIssue
        importTarget,
        new Meta(specifier.loc)
      );
    }
    let finalImportVariable = importElement;
    if (
      importNode.importKind !== "type" &&
      !isTypeDefinitions &&
      importElement instanceof Type
    ) {
      finalImportVariable = new VariableInfo(
        importElement,
        currentModuleTypeGraph
      );
    }
    if (
      (importNode.importKind === "type" || isTypeDefinitions) &&
      importElement instanceof VariableInfo
    ) {
      finalImportVariable = importElement.type;
    }
    // $FlowIssue
    importTarget.body.set(specifier.local.name, finalImportVariable);
    if (withPositions) {
      // $FlowIssue
      currentModuleTypeGraph.addPosition(specifier, finalImportVariable);
    }
  });
}

export default async function mixImportedDependencies(
  ast: Program,
  errors: Array<HegelError>,
  currentModuleScope: ModuleScope,
  currentTypeScope: TypeScope,
  getModuleTypeGraph: (string, string, SourceLocation) => Promise<ModuleScope>,
  isTypeDefinitions: boolean
): Promise<void> {
  const importRequests = [];
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === NODE.IMPORT_DECLARATION) {
      importRequests.push(
        Promise.all([
          node,
          getModuleTypeGraph(node.source.value, ast.path, node.loc).then(
            module => {
              if (
                errors.some(error => error.source === module.path) &&
                currentModuleScope instanceof PositionedModuleScope
              ) {
                errors.push(
                  new HegelError(
                    `There are problems inside "${node.source.value}"`,
                    node.loc,
                    currentModuleScope.path
                  )
                );
              }
              return module;
            }
          )
        ])
      );
    }
  }
  const importedTypeGraphs = await Promise.all(importRequests);
  for (let i = 0; i < importedTypeGraphs.length; i++) {
    try {
      const [importNode, moduleTypeGraph] = importedTypeGraphs[i];
      importDependencies(
        importNode,
        moduleTypeGraph,
        currentModuleScope,
        currentTypeScope,
        isTypeDefinitions
      );
    } catch (e) {
      if (!(e instanceof HegelError)) {
        throw e;
      }
      errors.push(e);
    }
  }
}

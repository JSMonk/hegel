// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { ObjectType } from "../type-graph/types/object-type";
import { addPosition } from "../utils/position-utils";
import { VariableInfo } from "../type-graph/variable-info";
import type { Scope } from "../type-graph/scope";
import type { ModuleScope, TypeGraph } from "../type-graph/module-scope";
import type {
  ImportDeclaration,
  Program,
  ImportSpecifier
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
  currentModuleTypeGraph: ModuleScope,
  currentModuleTypeScope: Scope
) {
  const { exports, exportsTypes } = moduleTypeGraph;
  const importSource =
    importNode.importKind === "value" ? exports : exportsTypes;
  const importTarget =
    importNode.importKind === "value"
      ? currentModuleTypeGraph
      : currentModuleTypeScope;
  const importEntries = [...importSource.entries()];
  importNode.specifiers.forEach(specifier => {
    const importName = getImportName(specifier);
    const importElement = importName
      ? importSource.get(importName)
      : ObjectType.createTypeWithName(
          // $FlowIssue
          ObjectType.getName(importEntries),
          currentModuleTypeScope,
          importEntries
        );
    if (!importElement) {
      throw new HegelError(
        `Module "${importNode.source.value}" hasn't "${importName ||
          "*"}" export`,
        specifier.loc
      );
    }
    const finalImportVariable =
      importElement instanceof VariableInfo
        ? importElement
        : new VariableInfo(
            importElement,
            importTarget,
            new Meta(specifier.loc)
          );
    importTarget.body.set(specifier.local.name, finalImportVariable);
    addPosition(specifier, finalImportVariable, currentModuleTypeGraph);
  });
}

export default async function mixImportedDependencies(
  ast: Program,
  errors: Array<HegelError>,
  currentModuleScope: ModuleScope,
  currentTypeScope: Scope,
  getModuleTypeGraph: (string, string) => Promise<ModuleScope>
): Promise<void> {
  const importRequests = [];
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === NODE.IMPORT_DECLARATION) {
      importRequests.push(
        Promise.all([node, getModuleTypeGraph(node.source.value, ast.path)])
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
        currentTypeScope
      );
    } catch (e) {
      if (!(e instanceof HegelError)) {
        throw e;
      }
      errors.push(e);
    }
  }
}

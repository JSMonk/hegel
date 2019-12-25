import { VariableInfo } from "../variable-info";
import { UNDEFINED_TYPE } from "../constants";
import { findVariableInfo } from "../../utils/common";

export function createTypeWithName(BaseType) {
  return (name, typeScope, ...args) => {
    if (name === UNDEFINED_TYPE) {
      return new BaseType(name, ...args);
    }
    let existedType;
    try {
      existedType = findVariableInfo({ name }, typeScope);
    } catch {}
    const newType = new BaseType(name, ...args);
    if (
      !existedType ||
      !(existedType instanceof VariableInfo) ||
      !(existedType.type instanceof BaseType) ||
      !existedType.type.equalsTo(newType)
    ) {
      existedType = new VariableInfo(newType, typeScope);
      typeScope.body.set(name, existedType);
      return newType;
    }

    return existedType.type;
  };
}

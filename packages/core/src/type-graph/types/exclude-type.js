import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";

export class $Exclude extends GenericType {
  static get name() {
    return "$Exclude";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Exclude",
      meta,
      [
        TypeVar.term("target", { parent }),
        TypeVar.term("properties", { parent })
      ],
      parent,
      null
    );
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo() {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target, whichShouldBeExclude] = parameters;
    const realTarget = this.getOponentType(target);
    if (realTarget instanceof TypeVar) {
      return this.bottomizeWith(parameters, realTarget.parent, loc);
    }
    if (!(realTarget instanceof UnionType)) {
      throw new HegelError("First parameter should be an union type", loc);
    }
    const picks =
      whichShouldBeExclude instanceof UnionType
        ? whichShouldBeExclude.variants
        : [whichShouldBeExclude];
    const pickedVariants = target.variants.filter(
      variant => picks.find(pick => pick.equalsTo(variant)) === undefined
    );
    return UnionType.term(null, {}, pickedVariants);
  }
}

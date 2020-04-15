import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $Class extends GenericType {
    static get name() {
        return "$Class";
    }

    constructor(_, meta = {}) {
        const parent = new TypeScope(meta.parent);
        super(
            "$Class",
            meta,
            [TypeVar.term("target", { parent })],
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

    applyGeneric(parameters, loc) {
        super.assertParameters(parameters, loc);
        const [target] = parameters;
        const realTarget = this.getOponentType(target);
        if (realTarget instanceof TypeVar) {
          return this.bottomizeWith(parameters, realTarget.parent, loc);
        }
        if (
            !(realTarget instanceof ObjectType && realTarget.classType !== null)
        ) {
            throw new HegelError("Cannot apply $Class to non-class instance type", loc);
        }
        return realTarget.classType;
    }
}

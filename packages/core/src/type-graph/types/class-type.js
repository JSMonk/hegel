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
        if (
            !(target instanceof ObjectType && target.classType !== null)
        ) {
            throw new HegelError("Cannot apply $Class to non-class instance type", loc);
        }
        return target.classType;
    }
}

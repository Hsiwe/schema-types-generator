# Motivation

Generate tree-like types from an intermediate language that can be generated from an external schemas. Track different versions of schemas through snapshots.

# Usage

External schemas should be transformed into `UnitReflectionT`. Every unit represents a 'node' in a resulting type tree.

Units support the following types:

|     |     |
| --- | --- |
| Intermediate type | TS representation |
| string | `string` |
| number | `number` |
| boolean | `boolean` |
| date | `Date` |
| select (deprecated, should be implemented through 'custom' type instead) | `{key: string, value: string}` |
| recursive | depends on values provided to the recursive unit |
| custom | depends on ts.TypeNode provided to the custom unit |
| unknown | `unknown` |

You have to directly call the main endpoint: `initConfiguration` from your code(with ts-node or node) and provide a config. After that you can use interactive shell to generate types for schemas.

# Example

Usage example can be found in `./src/simple-schema`. You also can clone the repository and build the sample schema yourself:

1.  Clone the repository,
    `git clone https://github.com/Hsiwe/schema-types-generator/tree/master`
2.  Install dependencies,
    `npm i`
3.  Generate types for sample schema,
    `npm run generate-sample`
4.  Explore generated code in `./generated` folder.

# FAQ

**Q**: What if I want to generate types that are not provided by default?

**A**: Use `custom` unit type.

* * *

**Q**: I can't use `custom` type because my schemas have 'external' types(dependencies from libraries, e.g. MongoDB ObjectIds)?

**A**: Currently there's no special support for types like this. However you can solve this problem by declaring and using a new global type.

For example: (global.d.ts)

```TypeScript
import { Types } from 'mongoose';

declare global {
    export interface IGlobalObjectId extends Types.ObjectId {}
}
```

(my-schema-to-intermediate-schema.ts)

```TypeScript
function mySchemaUnitToIntermediateSchemaUnit(myUnit: SomeUnit): UnitReflectionT {
    return {
        key: 'key',
        required: true,	
        returnValue: 'custom',
        type: ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('IGlobalObjectId'), undefined)
    };
}
```

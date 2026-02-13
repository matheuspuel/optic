# @matheuspuel/optic

Composable, readable, typed optics
for reading and immutably updating nested data structures.

## Install

```bash
pnpm add @matheuspuel/optic
```

## Quick start

```ts
type RootState = { user: { name: string; age: number } }
const root = Optic.id<RootState>()

const state: RootState = { user: { name: 'Alice', age: 30 } }

const age = root._.user._.age.get(state)
const nextState = root._.user._.name.update(_ => _.toUpperCase())(state)
```

## Compose optics

```ts
type RootState = { a: { b: number } }

const optic = Optic.id<RootState>()._.a.compose(Optic.id<RootState['a']>()._.b)

const state: RootState = { a: { b: 1 } }
const nextState = optic.update(n => n + 1)(state)
```

## Optional optics for arrays

```ts
type Item = { id: number; value: string }
type RootState = Item[]

const itemOptic = Optic.id<RootState>().find(_ => _.id === 1)

const state: RootState = [{ id: 1, value: 'a' }]

const found = itemOptic.getOption(state) // Option<Item>
const nextState = itemOptic.update(_ => ({ ..._, value: 'b' }))(state)
```

## Class support

Update the inner structure of a class and receive back a new class instance,
with the prototype, methods and the guarantee that the constructor has been called.

```ts
class User {
  constructor(
    public name: string,
    public age: number,
  ) {
    if (age < 0) throw new Error('Age cannot be negative')
  }
}

type RootState = { user: User }

// Provide the class and a function to get the constructor parameters based on the fields
const optic = Optic.id<RootState>()._.user.class(
  User,
  _ => [_.name, _.age] as const,
)

const state: RootState = { user: new User('Alice', 30) }
const nextState = optic._.age.update(n => n + 1)(state)

// Error: Age cannot be negative
optic._.age.update(() => -1)(state)
```

It's even simpler if the constructor have a single parameter
that is directly satisfied by the class fields.

```ts
class User {
  name: string
  age: number
  constructor(fields: { name: string; age: number }) {
    if (fields.age < 0) throw new Error('Age cannot be negative')
    this.name = fields.name
    this.age = fields.age
  }
}

type RootState = { user: User }

const optic = Optic.id<RootState>()._.user.class(User)

const state: RootState = { user: new User('Alice', 30) }
const nextState = optic._.age.update(n => n + 1)(state)
```

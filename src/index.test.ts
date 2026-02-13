import { Optic } from '@matheuspuel/optic'
import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

describe('Optic', () => {
  it('id', () => {
    type RootState = { a: number; b: { c: string } }
    const RootState = Optic.id<RootState>()
    const initialState: RootState = { a: 1, b: { c: 'hello' } }
    const store = makeStore(initialState)

    const optic = RootState
    {
      expect(store.get()).toStrictEqual(initialState)
      expect(optic.get(store.get())).toStrictEqual(initialState)
    }
    {
      store.update(optic.update(_ => _))
      expect(store.get()).toStrictEqual(initialState)
    }
    {
      store.update(optic.update(_ => ({ ..._, a: 2 })))
      expect(store.get()).toStrictEqual({ ...initialState, a: 2 })
      expect(optic.get(store.get())).toStrictEqual({ ...initialState, a: 2 })
    }
  })

  it('compose', () => {
    {
      type RootState = { a: { b: number } }
      const initialState: RootState = { a: { b: 1 } }
      const store = makeStore(initialState)
      const optic = Optic.id<RootState>()._.a.compose(
        Optic.id<RootState['a']>()._.b,
      )
      expect(optic.get(store.get())).toStrictEqual(1)
      store.update(optic.update(_ => _ + 1))
      expect(optic.get(store.get())).toStrictEqual(2)
      expect(store.get()).toStrictEqual({ a: { b: 2 } })
    }
    {
      type RootState = { id: number; a: number }[]
      const initialState: RootState = [{ id: 1, a: 1 }]
      const store = makeStore(initialState)
      const optic = Optic.id<RootState>()
        .find(_ => _.id === 1)
        .compose(Optic.id<RootState[number]>()._.a)
      expect(optic.getOption(store.get())).toStrictEqual(Option.some(1))
      store.update(optic.update(_ => _ + 1))
      expect(optic.getOption(store.get())).toStrictEqual(Option.some(2))
      expect(store.get()).toStrictEqual([{ id: 1, a: 2 }])
    }
  })

  it('Struct property', () => {
    type RootState = { a: number; b: { c: string } }
    const RootState = Optic.id<RootState>()
    const initialState: RootState = { a: 1, b: { c: 'hello' } }
    const store = makeStore(initialState)

    {
      const optic = RootState._.a
      expect(optic.get(store.get())).toStrictEqual(initialState.a)
      store.update(optic.update(_ => _ + 1))
      expect(optic.get(store.get())).toStrictEqual(2)
      expect(store.get()).toStrictEqual({ ...initialState, a: 2 })
    }
    {
      const optic = RootState._.b._.c
      expect(optic.get(store.get())).toStrictEqual(initialState.b.c)
      store.update(optic.update(_ => _ + ' world'))
      expect(optic.get(store.get())).toStrictEqual('hello world')
      expect(store.get()).toStrictEqual({ a: 2, b: { c: 'hello world' } })
    }
  })

  it('Array find', () => {
    type RootState = { id: number; a: number; b: { id: number; c: string }[] }[]
    const RootState = Optic.id<RootState>()
    const initialState: RootState = [
      { id: 1, a: 1, b: [{ id: 2, c: 'b' }] },
      {
        id: 2,
        a: 2,
        b: [
          { id: 1, c: 'a' },
          { id: 2, c: 'b' },
          { id: 2, c: 'c' },
        ],
      },
      { id: 2, a: 5, b: [{ id: 2, c: 'b' }] },
    ]
    const store = makeStore(initialState)

    {
      const optic = RootState.find(_ => _.id === 99)
      store.update(optic.update(_ => ({ ..._, a: 88 })))
      expect(store.get()).toStrictEqual(initialState)
    }
    {
      const optic = RootState.find(_ => _.id === 2)._.a
      store.update(optic.update(_ => _ + 1))
      expect(optic.getOption(store.get())).toStrictEqual<
        ReturnType<(typeof optic)['getOption']>
      >(Option.some(3))
      expect(store.get()).toStrictEqual([
        initialState[0],
        { ...initialState[1], a: 3 },
        initialState[2],
      ])
    }
    {
      const optic = RootState.find(_ => _.id === 2)._.b.find(_ => _.id === 2)._
        .c
      store.update(optic.update(_ => _ + 'x'))
      expect(optic.getOption(store.get())).toStrictEqual<
        ReturnType<(typeof optic)['getOption']>
      >(Option.some('bx'))
      expect(store.get()).toStrictEqual([
        initialState[0],
        {
          ...initialState[1],
          a: 3,
          b: [
            initialState[1]!.b[0],
            { ...initialState[1]!.b[1], c: 'bx' },
            initialState[1]!.b[2],
          ],
        },
        initialState[2],
      ])
    }
  })

  describe('class', () => {
    it('fields as constructor parameter', () => {
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
      const RootState = Optic.id<RootState>()
      const user = new User({ name: 'Alice', age: 30 })
      const initialState: RootState = { user }
      const store = makeStore(initialState)
      const optic = RootState._.user.class(User)

      expect(store.get().user).toStrictEqual(user)
      expect(store.get().user).toBeInstanceOf(User)
      expect(store.get().user).toEqual({ name: user.name, age: user.age })
      expect(optic.get(store.get()).name).toStrictEqual(user.name)
      expect(optic._.age.get(store.get())).toStrictEqual(user.age)
      store.update(optic.update(_ => ({ name: 'Bob', age: _.age })))
      expect(store.get().user).toEqual({ name: 'Bob', age: 30 })
      expect(store.get().user).toBeInstanceOf(User)
      expect(store.get().user).not.toBe(user)
      store.update(optic.update(_ => ({ ..._, age: _.age + 1 })))
      expect(store.get().user).toEqual({ name: 'Bob', age: 31 })
      store.update(optic._.age.update(_ => _ + 1))
      expect(store.get().user).toEqual({ name: 'Bob', age: 32 })
      expect(store.get().user).toBeInstanceOf(User)
      expect(() => optic._.age.update(() => -1)(store.get())).toThrow(
        'Age cannot be negative',
      )
    })

    it('independent constructor parameters', () => {
      class User {
        constructor(
          public name: string,
          public age: number,
        ) {
          if (age < 0) throw new Error('Age cannot be negative')
        }
      }

      type RootState = { user: User }
      const RootState = Optic.id<RootState>()
      const user = new User('Alice', 30)
      const initialState: RootState = { user }
      const store = makeStore(initialState)
      const optic = RootState._.user.class(User, _ => [_.name, _.age] as const)

      expect(store.get().user).toStrictEqual(user)
      expect(store.get().user).toBeInstanceOf(User)
      expect(store.get().user).toEqual({ name: user.name, age: user.age })
      expect(optic.get(store.get()).name).toStrictEqual(user.name)
      expect(optic._.age.get(store.get())).toStrictEqual(user.age)
      store.update(optic.update(_ => ({ name: 'Bob', age: _.age })))
      expect(store.get().user).toEqual({ name: 'Bob', age: 30 })
      expect(store.get().user).toBeInstanceOf(User)
      expect(store.get().user).not.toBe(user)
      store.update(optic.update(_ => ({ ..._, age: _.age + 1 })))
      expect(store.get().user).toEqual({ name: 'Bob', age: 31 })
      store.update(optic._.age.update(_ => _ + 1))
      expect(store.get().user).toEqual({ name: 'Bob', age: 32 })
      expect(store.get().user).toBeInstanceOf(User)
      expect(() => optic._.age.update(() => -1)(store.get())).toThrow(
        'Age cannot be negative',
      )
    })
  })
})

const makeStore = <A>(initialState: A) => {
  return (() => {
    let state = initialState
    return {
      get: () => state,
      update: (f: (s: A) => A) => {
        state = f(state)
      },
    }
  })()
}

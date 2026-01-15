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

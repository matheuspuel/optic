import { Array, Option } from 'effect'

export const Optional: unique symbol = Symbol.for('Optional')
export type Optional = typeof Optional

type OpticBase<Focus, Whole, Optional extends boolean = false> = {
  [Optional]: Optional
  getOption: (s: Whole) => Option.Option<Focus>
  update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
  compose: <Focus2, Optional2 extends boolean = false>(
    other: Optic<Focus2, Focus, Optional2>,
  ) => Optic<
    Focus2,
    Whole,
    Optional extends true ? true : Optional2 extends true ? true : false
  >
  class: (
    Class: new (...args: any[]) => Focus,
  ) => Optic<ClassFields<Focus>, Whole, Optional>
} & (Optional extends false ? { get: (s: Whole) => Focus } : {})

export type Optic<Focus, Whole, Optional extends boolean = false> = OpticBase<
  Focus,
  Whole,
  Optional
> &
  (Focus extends Record<string, unknown>
    ? { _: { [K in keyof Focus]: Optic<Focus[K], Whole, Optional> } }
    : Focus extends readonly (infer Item)[]
      ? { find: (predicate: (a: Item) => boolean) => Optic<Item, Whole, true> }
      : unknown)

const make: {
  <Focus, Whole>(args: {
    get: (s: Whole) => Focus
    getOption?: never
    update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
  }): Optic<Focus, Whole, false>
  <Focus, Whole>(args: {
    get?: never
    getOption: (s: Whole) => Option.Option<Focus>
    update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
  }): Optic<Focus, Whole, true>
} = <
  Focus,
  Whole,
  Args extends
    | {
        update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
        get: (s: Whole) => Focus
      }
    | {
        update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
        getOption: (s: Whole) => Option.Option<Focus>
      },
>(
  args: Args,
) => {
  type Optional = typeof args extends { get: (s: Whole) => Focus }
    ? false
    : true
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const compose = <Focus2, Optional2 extends boolean = false>(
    other: Optic<Focus2, Focus, Optional2>,
  ) => {
    return 'get' in args && 'get' in other
      ? make<Focus2, Whole>({
          get: s => other.get(args.get(s)),
          update: f => s => args.update(other.update(f))(s),
        })
      : make<Focus2, Whole>({
          getOption: (s: Whole) =>
            Option.flatMap(
              'get' in args ? Option.some(args.get(s)) : args.getOption(s),
              s =>
                'get' in other ? Option.some(other.get(s)) : other.getOption(s),
            ),
          update: f => s => args.update(other.update(f))(s),
        })
  }
  return {
    ...args,
    compose,
    class: (Class: new (...args: any[]) => Focus) =>
      compose(
        make<ClassFields<Focus>, Focus>({
          get: _ => _,
          update: f => _ => new Class(f(_)),
        }),
      ),
    _: new Proxy(
      {} as {
        [K in keyof Focus]: Optic<Focus[K], Whole, Optional>
      },
      {
        get: (_target, prop: string & keyof Focus, _receiver) =>
          compose(
            make<Focus[string & keyof Focus], Focus>({
              get: _ => _[prop],
              update: f => _ => ({ ..._, [prop]: f(_[prop]) }),
            }),
          ),
      },
    ),
    find: <Item>(predicate: (a: Item) => boolean) =>
      compose(
        make<Item, Focus>({
          getOption: _ => Array.findFirst(_ as Item[], predicate),
          update: f => _ =>
            Option.match(Array.findFirstIndex(_ as Item[], predicate), {
              onSome: index => Array.modify(_ as Item[], index, f),
              onNone: () => _,
            }) as Focus,
        }),
      ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

export const Optic = {
  make,
  id: <Whole>(): Optic<Whole, Whole, false> =>
    make({ get: s => s, update: f => s => f(s) }),
}

type ClassFields<A> = {
  [key in keyof A]: A[key]
}

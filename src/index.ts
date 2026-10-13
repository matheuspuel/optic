import { Array, Option } from 'effect'

/**
 * Track whether an optic is optional (can fail to focus on a value).
 * Optional optics use `getOption` which returns `Option<Focus>` instead of `Focus`.
 */
export const Optional: unique symbol = Symbol.for('Optional')
export type Optional = typeof Optional

type OpticBase<Focus, Whole, Optional extends boolean = false> = {
  [Optional]: Optional
  /**
   * Get a focused value as an Option.
   * Provides a safe way to access the value when the optic is optional.
   */
  getOption: (s: Whole) => Option.Option<Focus>
  /** Transform a focused value and return the whole structure updated. */
  update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
  /** Compose with another optic. */
  compose: <Focus2, Optional2 extends boolean = false>(
    other: Optic<Focus2, Focus, Optional2>,
  ) => Optic<
    Focus2,
    Whole,
    Optional extends true ? true : Optional2 extends true ? true : false
  >
  /**
   * Helps focusing on class instances by treating their fields as a plain object.
   *
   * Creates an optic for accessing the class fields
   * and updating the inner structure,
   * creating a new class instance with the updated fields,
   * maintaining the class prototype, methods
   * and the guarantee that the constructor has been called.
   *
   * @example
   * ```ts
   * class User {
   *   constructor(
   *     public name: string,
   *     public age: number,
   *   ) {
   *     if (age < 0) throw new Error('Age cannot be negative')
   *   }
   * }
   *
   * type RootState = { user: User }
   *
   * // Provide the class and a function to get the constructor parameters based on the fields
   * const optic = Optic.id<RootState>()._.user.class(
   *   User,
   *   _ => [_.name, _.age] as const,
   * )
   *
   * const state: RootState = { user: new User('Alice', 30) }
   * const nextState = optic._.age.update(n => n + 1)(state)
   *
   * // Error: Age cannot be negative
   * optic._.age.update(() => -1)(state)
   * ```
   *
   * When the constructor have a single parameter
   * that is directly satisfied by the class fields:
   * ```ts
   * class User {
   *   name: string
   *   age: number
   *   constructor(fields: { name: string; age: number }) {
   *     if (fields.age < 0) throw new Error('Age cannot be negative')
   *     this.name = fields.name
   *     this.age = fields.age
   *   }
   * }
   *
   * type RootState = { user: User }
   *
   * const optic = Optic.id<RootState>()._.user.class(User)
   *
   * const state: RootState = { user: new User('Alice', 30) }
   * const nextState = optic._.age.update(n => n + 1)(state)
   * ```
   */
  class: {
    (
      Class: new (param: ClassFields<Focus>) => Focus,
    ): Optic<ClassFields<Focus>, Whole, Optional>
    <ConstructorParameters extends any[]>(
      Class: new (...args: ConstructorParameters) => Focus,
      getConstructorParameters: (
        fields: ClassFields<Focus>,
      ) => ConstructorParameters,
    ): Optic<ClassFields<Focus>, Whole, Optional>
  }
} & (Optional extends false
  ? {
      /** Get the focused value (only for non-optional optics). */
      get: (s: Whole) => Focus
    }
  : // oxlint-disable-next-line typescript/no-empty-object-type
    {})

/**
 * Optics provide a way to focus on, read, and update
 * nested values within a data structure.
 *
 * @template Focus - The type of the value being focused on
 * @template Whole - The type of the root value being operated on
 * @template Optional - Whether this optic can fail to focus
 *
 * @example
 * type RootState = { user: { name: string } }
 * const optic = Optic.id<RootState>()._.user._.name
 * const name = optic.get(state)
 * const newState = optic.update(name => name.toUpperCase())(state)
 */
export type Optic<Focus, Whole, Optional extends boolean = false> = OpticBase<
  Focus,
  Whole,
  Optional
> &
  (Focus extends Record<string, unknown>
    ? {
        /** Focus on the fields of the object. */
        _: { [K in keyof Focus]: Optic<Focus[K], Whole, Optional> }
      }
    : Focus extends readonly (infer Item)[]
      ? {
          /**
           * Focus on the the first element of the array matching a predicate.
           *
           * It creates an optional optic that can fail if no element matches the predicate.
           */
          find: (predicate: (a: Item) => boolean) => Optic<Item, Whole, true>
        }
      : unknown)

const make: {
  <Focus, Whole>(args: {
    /* How to get the focused value from the whole structure */
    get: (s: Whole) => Focus
    getOption?: never
    /**
     * How to update the whole structure by transforming the focused value.
     * The returned function should be pure and preserve the surrounding structure.
     */
    update: (f: (a: Focus) => Focus) => (s: Whole) => Whole
  }): Optic<Focus, Whole>
  <Focus, Whole>(args: {
    get?: never
    /** How to get the focused value as an Option from the whole structure */
    getOption: (s: Whole) => Option.Option<Focus>
    /**
     * How to update the whole structure by transforming the focused value when present.
     * The returned function should be pure and preserve the surrounding structure.
     */
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
  const compose = <Focus2, Optional2 extends boolean = false>(
    other: Optic<Focus2, Focus, Optional2>,
  ): Optic<Focus2, Whole, Optional2 extends false ? Optional : true> =>
    ('get' in args && 'get' in other
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
        })) as any
  const class_ = ((
    Class: new (...args: any[]) => Focus,
    getConstructorParameters = (_: ClassFields<Focus>) => [_] as const,
  ) =>
    compose(
      make<ClassFields<Focus>, Focus>({
        get: _ => _,
        update: f => _ => new Class(...getConstructorParameters(f(_))),
      }),
    )) as Optic<Focus, Whole, Optional>['class']
  return {
    ...args,
    compose,
    class: class_,
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
              onSome: index =>
                Option.getOrElse(Array.modify(_ as Item[], index, f), () => _),
              onNone: () => _,
            }) as Focus,
        }),
      ),
  } as any
}

export const Optic = {
  /**
   * Creates a new optic from getter and update functions.
   *
   * @example
   * type RootState = { user: { name: string } }
   * const userOptic = Optic.make({
   *   get: (state: RootState) => state.user,
   *   update: (f) => (state) => ({ ...state, user: f(state.user) })
   * })
   */
  make,
  /**
   * Creates an optic that focuses on the entire value.
   * Use this as a starting point for composing optics.
   *
   * @template Whole - The type being operated on
   *
   * @example
   * type RootState = { user: { name: string } }
   * const root = Optic.id<RootState>()
   * const userNameOptic = root._.user._.name
   */
  id: <Whole>(): Optic<Whole, Whole> =>
    make({ get: s => s, update: f => s => f(s) }),
}

/**
 * Utility type that extracts all fields from a class as a plain object type.
 *
 * @template Class - The class type to extract fields from
 *
 * @example
 * class User { name: string; age: number }
 * type UserFields = ClassFields<User> // { name: string; age: number }
 */
type ClassFields<Class> = {
  [key in keyof Class]: Class[key]
}

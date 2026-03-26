import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type LendBid = { owner: Uint8Array;
                        amount: bigint;
                        r_min: bigint;
                        revealed: boolean
                      };

export type BorrowBid = { owner: Uint8Array;
                          amount: bigint;
                          r_max: bigint;
                          collateral: bigint;
                          revealed: boolean
                        };

export type Loan = { lender: Uint8Array;
                     borrower: Uint8Array;
                     principal: bigint;
                     collateral: bigint;
                     rate: bigint;
                     repaid: boolean
                   };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          owner_0: Uint8Array,
          amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           owner_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submit_lend(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submit_borrow(context: __compactRuntime.CircuitContext<PS>,
                commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  reveal_lend(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array,
              owner_0: Uint8Array,
              amount_0: bigint,
              r_min_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  reveal_borrow(context: __compactRuntime.CircuitContext<PS>,
                commitment_0: Uint8Array,
                owner_0: Uint8Array,
                amount_0: bigint,
                r_max_0: bigint,
                collateral_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         rate_0: bigint,
         lend_slot_0: bigint,
         borrow_slot_0: bigint,
         match_amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  repay(context: __compactRuntime.CircuitContext<PS>,
        loan_id_0: bigint,
        caller_0: Uint8Array,
        total_due_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  advance_phase(context: __compactRuntime.CircuitContext<PS>,
                caller_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          owner_0: Uint8Array,
          amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           owner_0: Uint8Array,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submit_lend(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submit_borrow(context: __compactRuntime.CircuitContext<PS>,
                commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  reveal_lend(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array,
              owner_0: Uint8Array,
              amount_0: bigint,
              r_min_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  reveal_borrow(context: __compactRuntime.CircuitContext<PS>,
                commitment_0: Uint8Array,
                owner_0: Uint8Array,
                amount_0: bigint,
                r_max_0: bigint,
                collateral_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         rate_0: bigint,
         lend_slot_0: bigint,
         borrow_slot_0: bigint,
         match_amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  repay(context: __compactRuntime.CircuitContext<PS>,
        loan_id_0: bigint,
        caller_0: Uint8Array,
        total_due_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  advance_phase(context: __compactRuntime.CircuitContext<PS>,
                caller_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly phase: bigint;
  readonly epoch_num: bigint;
  readonly operator: Uint8Array;
  balances: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  lend_commits: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  borrow_commits: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  lend_bids: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): LendBid;
    [Symbol.iterator](): Iterator<[bigint, LendBid]>
  };
  borrow_bids: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): BorrowBid;
    [Symbol.iterator](): Iterator<[bigint, BorrowBid]>
  };
  readonly lend_count: bigint;
  readonly borrow_count: bigint;
  readonly clearing_rate: bigint;
  readonly matched_volume: bigint;
  loans: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Loan;
    [Symbol.iterator](): Iterator<[bigint, Loan]>
  };
  readonly loan_count: bigint;
  readonly total_deposits: bigint;
  readonly total_locked: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               admin_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

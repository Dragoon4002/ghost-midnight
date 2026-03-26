import { createLogger } from "../../logger.js";
import { LogicTestingConfig } from "../../config.js";
import {
  Contract,
  type Ledger,
  ledger
} from "../../managed/ghost/contract/index.js";
import {
  type GhostPrivateState,
  createPrivateState,
  computeCommitment,
  witnesses
} from "../../witnesses.js";
import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
  type CircuitResults,
  type CoinPublicKey,
  emptyZswapLocalState,
  type ContractAddress
} from "@midnight-ntwrk/compact-runtime";
import { toHexPadded } from "../utils/utils.js";

const config = new LogicTestingConfig();
export const logger = await createLogger(config.logDir);

export class GhostSimulator {
  readonly contract: Contract<GhostPrivateState>;
  circuitContext: CircuitContext<GhostPrivateState>;
  userPrivateStates: Record<string, GhostPrivateState>;
  updateUserPrivateState: (newPrivateState: GhostPrivateState) => void;
  contractAddress: ContractAddress;

  constructor(privateState: GhostPrivateState) {
    this.contract = new Contract<GhostPrivateState>(witnesses);
    this.contractAddress = sampleContractAddress();
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      createConstructorContext(
        { ownerKey: privateState.ownerKey },
        toHexPadded("deployer")
      )
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      currentQueryContext: new QueryContext(
        currentContractState.data,
        this.contractAddress
      ),
      costModel: CostModel.initialCostModel()
    };
    this.userPrivateStates = { ["deployer"]: currentPrivateState };
    this.updateUserPrivateState = () => {};
  }

  static deploy(ownerKey: string): GhostSimulator {
    return new GhostSimulator(createPrivateState(ownerKey));
  }

  addUser(name: string, ownerKey: string): void {
    this.userPrivateStates[name] = createPrivateState(ownerKey);
  }

  private buildContext(
    currentPrivateState: GhostPrivateState
  ): CircuitContext<GhostPrivateState> {
    return {
      ...this.circuitContext,
      currentPrivateState,
    };
  }

  private updateUserByName =
    (name: string) =>
    (newPrivateState: GhostPrivateState): void => {
      this.userPrivateStates[name] = newPrivateState;
    };

  as(name: string): GhostSimulator {
    const ps = this.userPrivateStates[name];
    if (!ps) {
      throw new Error(`No private state for user '${name}'`);
    }
    this.circuitContext = this.buildContext(ps);
    this.updateUserPrivateState = this.updateUserByName(name);
    return this;
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  getPrivateState(): GhostPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  private applyResult<T>(results: CircuitResults<GhostPrivateState, T>): Ledger {
    this.circuitContext = results.context;
    this.updateUserPrivateState(results.context.currentPrivateState);
    return this.getLedger();
  }

  // ─── Circuit Wrappers ───────────────────────────────────────────

  deposit(amount: bigint): Ledger {
    const results = this.contract.impureCircuits.deposit(this.circuitContext, amount);
    return this.applyResult(results);
  }

  withdraw(amount: bigint): Ledger {
    const results = this.contract.impureCircuits.withdraw(this.circuitContext, amount);
    return this.applyResult(results);
  }

  submitLend(commitment: string): Ledger {
    const results = this.contract.impureCircuits.submit_lend(this.circuitContext, commitment);
    return this.applyResult(results);
  }

  submitBorrow(commitment: string): Ledger {
    const results = this.contract.impureCircuits.submit_borrow(this.circuitContext, commitment);
    return this.applyResult(results);
  }

  revealLend(commitment: string, amount: bigint, rMin: bigint, nonce: string): Ledger {
    const results = this.contract.impureCircuits.reveal_lend(
      this.circuitContext, commitment, amount, rMin, nonce
    );
    return this.applyResult(results);
  }

  revealBorrow(
    commitment: string, amount: bigint, rMax: bigint,
    collateral: bigint, nonce: string
  ): Ledger {
    const results = this.contract.impureCircuits.reveal_borrow(
      this.circuitContext, commitment, amount, rMax, collateral, nonce
    );
    return this.applyResult(results);
  }

  clearEpoch(): Ledger {
    const results = this.contract.impureCircuits.clear_epoch(this.circuitContext);
    return this.applyResult(results);
  }

  repay(loanId: bigint): Ledger {
    const results = this.contract.impureCircuits.repay(this.circuitContext, loanId);
    return this.applyResult(results);
  }

  advancePhase(): Ledger {
    const results = this.contract.impureCircuits.advance_phase(this.circuitContext);
    return this.applyResult(results);
  }
}

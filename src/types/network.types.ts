// src/types/network.types.ts
export interface Network {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly zSwapNetworkId: number;
}

// src/config/network.ts
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import type { Network } from "../types/network.types";

export class TestnetRemoteNetwork implements Network {
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
  indexer = "https://indexer.testnet-02.midnight.network/api/v1/graphql";
  indexerWS = "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws";
  node = "https://rpc.testnet-02.midnight.network";
  proofServer = "http://127.0.0.1:6300";
  zSwapNetworkId = getZswapNetworkId();
}

export class TestnetLocalNetwork implements Network {
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
  indexer = "http://127.0.0.1:8088/api/v1/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v1/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  zSwapNetworkId = getZswapNetworkId();
}

export class UndeployedNetwork implements Network {
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
  indexer = "http://127.0.0.1:8088/api/v1/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v1/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  zSwapNetworkId = getZswapNetworkId();
}

import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";

// Configure for Midnight Undeployed
setNetworkId(NetworkId.Undeployed);

// Local Midnight Network (Docker)
const UNDEPLOYED_CONFIG = {
  indexer: "http://127.0.0.1:8088/api/v1/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v1/graphql/ws",
  node: "http://127.0.0.1:9944",
  proofServer: "http://127.0.0.1:6300",
};

const provider = indexerPublicDataProvider(
  UNDEPLOYED_CONFIG.indexer,
  UNDEPLOYED_CONFIG.indexerWS
);

const contractAddress =
  "02005df361175014ae8d355e180a86ca6be9a69ab5e5a8ee868a2eb5ae03f618791a";

// Example: query latest contract state
const state = await provider.watchForDeployTxData(contractAddress);
console.log(state);

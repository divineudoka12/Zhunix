import dotenv from "dotenv";

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

export const config = {
  port: parseInt(process.env.PORT || "5000"),
  nodeEnv: process.env.NODE_ENV || "development",

  mongoUri: required("MONGODB_URI"),

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  og: {
    rpcUrl: required("OG_RPC_URL"),
    chainId: parseInt(process.env.OG_CHAIN_ID || "16602"),
    storageNodeUrl: required("OG_STORAGE_NODE_URL"),
    platformPrivateKey: required("PLATFORM_PRIVATE_KEY"),
    computeServiceUrl: required("ZG_SERVICE_URL"),
    computeApiSecret: required("ZG_API_SECRET"),
    computeModel: process.env.ZG_MODEL || "qwen/qwen-2.5-7b-instruct",
  },

  contracts: {
    dataRegistry: required("DATA_REGISTRY_ADDRESS"),
    dataMarketplace: required("DATA_MARKETPLACE_ADDRESS"),
    agentRegistry: required("AGENT_REGISTRY_ADDRESS"),
  },
};

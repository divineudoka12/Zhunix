import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DataRegistryModule = buildModule("DataRegistryModule", (m) => {
  const dataRegistry = m.contract("DataRegistry", []);

  return { dataRegistry };
});

export default DataRegistryModule;

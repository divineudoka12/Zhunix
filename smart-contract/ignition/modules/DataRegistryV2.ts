import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DataRegistryV2Module = buildModule("DataRegistryV2Module", (m) => {
  const dataRegistry = m.contract("DataRegistry", []);

  return { dataRegistry };
});

export default DataRegistryV2Module;

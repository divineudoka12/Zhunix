import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DataRegistryV2Module from "./DataRegistryV2.js";

const DEFAULT_PLATFORM_WALLET =
  process.env.PLATFORM_WALLET ?? "0x0000000000000000000000000000000000000001";

const DataMarketplaceV2Module = buildModule("DataMarketplaceV2Module", (m) => {
  const { dataRegistry } = m.useModule(DataRegistryV2Module);

  const platformWallet = m.getParameter(
    "platformWallet",
    DEFAULT_PLATFORM_WALLET
  );
  const platformFeeBps = m.getParameter("platformFeeBps", 500n);

  const dataMarketplace = m.contract("DataMarketplace", [
    dataRegistry,
    platformWallet,
    platformFeeBps,
  ]);

  m.call(dataRegistry, "transferOwnership", [dataMarketplace]);

  return { dataRegistry, dataMarketplace };
});

export default DataMarketplaceV2Module;

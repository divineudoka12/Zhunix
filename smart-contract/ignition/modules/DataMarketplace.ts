import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DataRegistryModule from "./DataRegistry.js";

const DEFAULT_PLATFORM_WALLET =
  process.env.PLATFORM_WALLET ?? "0x0000000000000000000000000000000000000001";

const DataMarketplaceModule = buildModule("DataMarketplaceModule", (m) => {

  const { dataRegistry } = m.useModule(DataRegistryModule);

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

export default DataMarketplaceModule;

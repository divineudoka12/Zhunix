import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AGENTIC_ID_CONTRACT = "0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F";

const AgentRegistryModule = buildModule("AgentRegistryModule", (m) => {
  const agenticIdAddress = m.getParameter("agenticIdContract", AGENTIC_ID_CONTRACT);

  const agentRegistry = m.contract("AgentRegistry", [agenticIdAddress]);

  return { agentRegistry };
});

export default AgentRegistryModule;

import type { BridgeData } from "@home-assistant-matter-hub/common";
import { NetworkCommissioning } from "@matter/main/clusters";
import type { Environment } from "@matter/main";
import { type Endpoint, ServerNode } from "@matter/main/node";
import { createBridgeServerConfig } from "../../utils/json/create-bridge-server-config.js";

export class BridgeServerNode extends ServerNode {
  constructor(env: Environment, bridgeData: BridgeData, aggregator: Endpoint) {
    const config = createBridgeServerConfig(bridgeData);
    const networkId = new Uint8Array(32);
    super(({
      ...config,
      environment: env,
      parts: [...(config.parts ?? []), aggregator],
      networkCommissioning: {
        maxNetworks: 1,
        interfaceEnabled: true,
        lastConnectErrorValue: 0,
        lastNetworkId: networkId,
        lastNetworkingStatus:
          NetworkCommissioning.NetworkCommissioningStatus.Success,
        networks: [{ networkId, connected: true }],
      },
    } as unknown) as any);
  }

  async factoryReset() {
    await this.cancel();
    await this.erase();
  }
}

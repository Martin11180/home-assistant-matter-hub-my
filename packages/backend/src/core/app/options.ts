import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { VendorId } from "@matter/main";
import type { ArgumentsCamelCase } from "yargs";
import type { WebApiProps } from "../../api/web-api.js";
import type { StartOptions } from "../../commands/start/start-options.js";
import type { BridgeServiceProps } from "../../services/bridges/bridge-service.js";
import type { HomeAssistantClientProps } from "../../services/home-assistant/home-assistant-client.js";
import type { LoggerServiceProps } from "./logger.js";
import type { MdnsOptions } from "./mdns.js";
import type { StorageOptions } from "./storage.js";

function resolveAppVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    // When installed globally via npm, this resolves to the published package.json
    // and provides the real semantic version.
    const pkg = require("home-assistant-matter-hub/package.json") as {
      version?: string;
    };
    if (pkg.version && pkg.version !== "0.0.0") {
      return pkg.version;
    }
  } catch {
    // ignore, fall through to env var
  }
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  return "0.0.0-dev";
}

function normalizeControllerSoftwareVersion(version: string): string {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return "0.0.0";
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function toMatterSoftwareVersion(version: string): number {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return 0;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return major * 100 + minor * 10 + patch;
}

export type OptionsProps = ArgumentsCamelCase<StartOptions> & {
  webUiDist: string | undefined;
};

export class Options {
  constructor(private readonly startOptions: OptionsProps) {}

  get mdns(): MdnsOptions {
    return {
      ipv4: true,
      networkInterface: notEmpty(this.startOptions.mdnsNetworkInterface),
    };
  }

  get logging(): LoggerServiceProps {
    return {
      level: this.startOptions.logLevel,
      protocolLevel: this.startOptions.protocolLogLevel,
      disableColors: this.startOptions.disableLogColors ?? false,
      jsonOutput: this.startOptions.jsonLogs ?? false,
    };
  }

  get storage(): StorageOptions {
    return {
      location: notEmpty(this.startOptions.storageLocation),
    };
  }

  get homeAssistant(): HomeAssistantClientProps {
    return {
      url: this.startOptions.homeAssistantUrl,
      accessToken: this.startOptions.homeAssistantAccessToken,
      refreshInterval: this.startOptions.homeAssistantRefreshInterval,
    };
  }

  get webApi(): WebApiProps {
    const auth: WebApiProps["auth"] =
      this.startOptions.httpAuthUsername && this.startOptions.httpAuthPassword
        ? {
            username: this.startOptions.httpAuthUsername,
            password: this.startOptions.httpAuthPassword,
          }
        : undefined;
    return {
      port: this.startOptions.httpPort,
      whitelist: this.startOptions.httpIpWhitelist?.map((item) =>
        item.toString(),
      ),
      webUiDist: this.startOptions.webUiDist,
      version: resolveAppVersion(),
      storageLocation: this.resolveStorageLocation(),
      basePath: normalizeBasePath(this.startOptions.httpBasePath),
      auth,
      mdnsInterface: notEmpty(this.startOptions.mdnsNetworkInterface),
      mdnsIpv4: true,
    };
  }

  private resolveStorageLocation(): string {
    const storageLocation = notEmpty(this.startOptions.storageLocation);
    const homedir = os.homedir();
    return storageLocation
      ? path.resolve(storageLocation.replace(/^~\//, `${homedir}/`))
      : path.join(homedir, ".home-assistant-matter-hub");
  }

  get bridgeService(): BridgeServiceProps {
    const resolvedAppVersion = resolveAppVersion();
    const softwareVersionString =
      normalizeControllerSoftwareVersion(resolvedAppVersion);
    return {
      basicInformation: {
        vendorId: VendorId(0xfff1),
        vendorName: "riddix",
        productId: 0x8000,
        productName: "MatterHub",
        productLabel: "Home Assistant Matter Hub",
        hardwareVersion: new Date().getFullYear(),
        softwareVersion: toMatterSoftwareVersion(softwareVersionString),
        softwareVersionString,
      },
    };
  }
}

function normalizeBasePath(val: string | undefined): string {
  let p = val?.trim() ?? "/";
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p;
}

function notEmpty(val: string | undefined | null): string | undefined {
  const value = val?.trim();
  if (value == null || value.length === 0) {
    return undefined;
  }
  return value;
}

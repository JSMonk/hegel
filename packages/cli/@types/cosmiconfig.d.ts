interface CosmicConfig<T> {
  config: T;
  filepath: string;
}

interface Cosmic {
  search<T>(workingDirectory: string): Promise<CosmicConfig<T> | null>;
}

export default function cosmic(configName: string): Cosmic;

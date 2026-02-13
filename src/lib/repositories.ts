export interface Repository {
  name: string;
  url: string;
  sshUrl: string;
  description?: string;
}

/**
 * Hardcoded list of valid repositories in the current working set
 */
export const REPOSITORIES: Repository[] = [
  {
    name: "cli",
    url: "https://github.com/codemarc/blt-cli.git",
    sshUrl: "git@github.com:codemarc/blt-cli.git",
    description: "BLT command line interface",
  },
  {
    name: "tools",
    url: "https://github.com/bltcore-com/tools.git",
    sshUrl: "git@github.com:bltcore-com/tools.git",
    description: "BLT core repository",
  },
  {
    name: "pos",
    url: "https://github.com/bltcore-com/blt-core-pos.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-pos.git",
    description: "core pos application",
  },
  {
    name: "data",
    url: "https://github.com/bltcore-com/blt-core-data.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-data.git",
    description: "data schema & sample data",
  },
  {
    name: "gateway",
    url: "https://github.com/bltcore-com/blt-device-gateway.git",
    sshUrl: "git@github.com:bltcore-com/blt-device-gateway.git",
    description: "device gateway",
  },
  {
    name: "deploy",
    url: "https://github.com/bltcore-com/deploy.git",
    sshUrl: "git@github.com:bltcore-com/deploy.git",
    description: "deployment scripts",
  },
  {
    name: "customers",
    url: "https://github.com/bltcore-com/customers.git",
    sshUrl: "git@github.com:bltcore-com/customers.git",
    description: "customer repository",
  },
  {
    name: "logz",
    url: "https://github.com/bltcore-com/blt-core-logz.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-logz.git",
    description: "BLT core logz repository",
  },  
];

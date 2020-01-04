const path = require("path");
const { workspace } = require("vscode");
const { TransportKind, LanguageClient } = require("vscode-languageclient");

let client;

exports.activate = context => {
  const serverModule = context.asAbsolutePath(path.join("server", "server.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions = {
    documentSelector: ["javascript"],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc")
    }
  };

  client = new LanguageClient(
    "hegelLanguageServer",
    "Hegel Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
};

exports.deactivate = () => client && client.stop();

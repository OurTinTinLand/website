#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/dotenv/package.json
var require_package = __commonJS({
  "node_modules/dotenv/package.json"(exports2, module2) {
    module2.exports = {
      name: "dotenv",
      version: "16.6.1",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var crypto = require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _log(message) {
      console.log(`[dotenv@${version}] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path.resolve(process.cwd(), ".env.vault");
      }
      if (fs.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = Boolean(options && options.debug);
      const quiet = options && "quiet" in options ? options.quiet : true;
      if (debug || !quiet) {
        _log("Loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      const quiet = options && "quiet" in options ? options.quiet : true;
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path2 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs.readFileSync(path2, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path2} ${e.message}`);
          }
          lastError = e;
        }
      }
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsedAll, options);
      if (debug || !quiet) {
        const keysCount = Object.keys(parsedAll).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            if (debug) {
              _debug(`Failed to load ${filePath} ${e.message}`);
            }
            lastError = e;
          }
        }
        _log(`injecting env (${keysCount}) from ${shortPaths.join(",")}`);
      }
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
        }
      }
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module2.exports.configDotenv = DotenvModule.configDotenv;
    module2.exports._configVault = DotenvModule._configVault;
    module2.exports._parseVault = DotenvModule._parseVault;
    module2.exports.config = DotenvModule.config;
    module2.exports.decrypt = DotenvModule.decrypt;
    module2.exports.parse = DotenvModule.parse;
    module2.exports.populate = DotenvModule.populate;
    module2.exports = DotenvModule;
  }
});

// node_modules/dotenv/lib/env-options.js
var require_env_options = __commonJS({
  "node_modules/dotenv/lib/env-options.js"(exports2, module2) {
    "use strict";
    var options = {};
    if (process.env.DOTENV_CONFIG_ENCODING != null) {
      options.encoding = process.env.DOTENV_CONFIG_ENCODING;
    }
    if (process.env.DOTENV_CONFIG_PATH != null) {
      options.path = process.env.DOTENV_CONFIG_PATH;
    }
    if (process.env.DOTENV_CONFIG_QUIET != null) {
      options.quiet = process.env.DOTENV_CONFIG_QUIET;
    }
    if (process.env.DOTENV_CONFIG_DEBUG != null) {
      options.debug = process.env.DOTENV_CONFIG_DEBUG;
    }
    if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
      options.override = process.env.DOTENV_CONFIG_OVERRIDE;
    }
    if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
      options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
    }
    module2.exports = options;
  }
});

// node_modules/dotenv/lib/cli-options.js
var require_cli_options = __commonJS({
  "node_modules/dotenv/lib/cli-options.js"(exports2, module2) {
    "use strict";
    var re = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/;
    module2.exports = function optionMatcher(args) {
      const options = args.reduce(function(acc, cur) {
        const matches = cur.match(re);
        if (matches) {
          acc[matches[1]] = matches[2];
        }
        return acc;
      }, {});
      if (!("quiet" in options)) {
        options.quiet = "true";
      }
      return options;
    };
  }
});

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports2) {
    "use strict";
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @constructor
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       * @constructor
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports2) {
    "use strict";
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @api private
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(`Allowed choices are ${this.argChoices.join(", ")}.`);
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports2.Argument = Argument2;
    exports2.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports2) {
    "use strict";
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        if (cmd._hasImplicitHelpCommand()) {
          const [, helpName, helpArgs] = cmd._helpCommandnameAndArgs.match(/([^ ]+) *(.*)/);
          const helpCommand = cmd.createCommand(helpName).helpOption(false);
          helpCommand.description(cmd._helpCommandDescription);
          if (helpArgs) helpCommand.arguments(helpArgs);
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns number
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const showShortHelpFlag = cmd._hasHelpOption && cmd._helpShortFlag && !cmd._findOption(cmd._helpShortFlag);
        const showLongHelpFlag = cmd._hasHelpOption && !cmd._findOption(cmd._helpLongFlag);
        if (showShortHelpFlag || showLongHelpFlag) {
          let helpOption;
          if (!showShortHelpFlag) {
            helpOption = cmd.createOption(cmd._helpLongFlag, cmd._helpDescription);
          } else if (!showLongHelpFlag) {
            helpOption = cmd.createOption(cmd._helpShortFlag, cmd._helpDescription);
          } else {
            helpOption = cmd.createOption(cmd._helpFlags, cmd._helpDescription);
          }
          visibleOptions.push(helpOption);
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(helper.optionTerm(option), helper.optionDescription(option));
          });
          if (globalOptionList.length > 0) {
            output = output.concat(["Global Options:", formatList(globalOptionList), ""]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str.match(manualIndent)) return str;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str;
        const leadingStr = str.slice(0, indent);
        const columnText = str.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports2.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports2) {
    "use strict";
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {string | string[]} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {Object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @api private
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(`Allowed choices are ${this.argChoices.join(", ")}.`);
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       * @api private
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @api private
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @api private
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports2.Option = Option2;
    exports2.splitOptionFlags = splitOptionFlags;
    exports2.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports2) {
    "use strict";
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports2.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var childProcess2 = require("child_process");
    var path = require("path");
    var fs = require("fs");
    var process2 = require("process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, splitOptionFlags, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str, write) => write(str)
        };
        this._hidden = false;
        this._hasHelpOption = true;
        this._helpFlags = "-h, --help";
        this._helpDescription = "display help for command";
        this._helpShortFlag = "-h";
        this._helpLongFlag = "--help";
        this._addImplicitHelpCommand = void 0;
        this._helpCommandName = "help";
        this._helpCommandnameAndArgs = "help [command]";
        this._helpCommandDescription = "display help for command";
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._hasHelpOption = sourceCommand._hasHelpOption;
        this._helpFlags = sourceCommand._helpFlags;
        this._helpDescription = sourceCommand._helpDescription;
        this._helpShortFlag = sourceCommand._helpShortFlag;
        this._helpLongFlag = sourceCommand._helpLongFlag;
        this._helpCommandName = sourceCommand._helpCommandName;
        this._helpCommandnameAndArgs = sourceCommand._helpCommandnameAndArgs;
        this._helpCommandDescription = sourceCommand._helpCommandDescription;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @api private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {Object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this.commands.push(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {Object} [configuration] - configuration options
       * @return {Command|Object} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {Object} [configuration] - configuration options
       * @return {Command|Object} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {boolean|string} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {Object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this.commands.push(cmd);
        cmd.parent = this;
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {Function|*} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Override default decision whether to add implicit help command.
       *
       *    addHelpCommand() // force on
       *    addHelpCommand(false); // force off
       *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
       *
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(enableOrNameAndArgs, description) {
        if (enableOrNameAndArgs === false) {
          this._addImplicitHelpCommand = false;
        } else {
          this._addImplicitHelpCommand = true;
          if (typeof enableOrNameAndArgs === "string") {
            this._helpCommandName = enableOrNameAndArgs.split(" ")[0];
            this._helpCommandnameAndArgs = enableOrNameAndArgs;
          }
          this._helpCommandDescription = description || this._helpCommandDescription;
        }
        return this;
      }
      /**
       * @return {boolean}
       * @api private
       */
      _hasImplicitHelpCommand() {
        if (this._addImplicitHelpCommand === void 0) {
          return this.commands.length && !this._actionHandler && !this._findCommand("help");
        }
        return this._addImplicitHelpCommand;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @api private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {Option | Argument} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @api private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(name, option.defaultValue === void 0 ? true : option.defaultValue, "default");
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        this.options.push(option);
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @api private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {Function|*} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
      * Add a required option which must have a value after parsing. This usually means
      * the option must be specified on the command line. (Otherwise the same as .option().)
      *
      * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
      *
      * @param {string} flags
      * @param {string} [description]
      * @param {Function|*} [parseArg] - custom option processing function or default value
      * @param {*} [defaultValue]
      * @return {Command} `this` command for chaining
      */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {Boolean} [combine=true] - if `true` or omitted, an optional value can be specified directly after the flag.
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {Boolean} [allowUnknown=true] - if `true` or omitted, no error will be thrown
       * for unknown options.
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {Boolean} [allowExcess=true] - if `true` or omitted, no error will be thrown
       * for excess arguments.
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {Boolean} [positional=true]
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {Boolean} [passThrough=true]
       * for unknown options.
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        if (!!this.parent && passThrough && !this.parent._enablePositionalOptions) {
          throw new Error("passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)");
        }
        return this;
      }
      /**
        * Whether to store option values as properties on command object,
        * or store separately (specify false). In both cases the option values can be accessed using .opts().
        *
        * @param {boolean} [storeAsProperties=true]
        * @return {Command} `this` command for chaining
        */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {Object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {Object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
        * Store option value and where the value came from.
        *
        * @param {string} key
        * @param {Object} value
        * @param {string} source - expected values are default/config/env/cli/implied
        * @return {Command} `this` command for chaining
        */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
        * Get source of option value.
        * Expected values are default | config | env | cli | implied
        *
        * @param {string} key
        * @return {string}
        */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
        * Get source of option value. See also .optsWithGlobals().
        * Expected values are default | config | env | cli | implied
        *
        * @param {string} key
        * @return {string}
        */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @api private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0) {
          argv = process2.argv;
          if (process2.versions && process2.versions.electron) {
            parseOptions.from = "electron";
          }
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          default:
            throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
        }
        if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * The default expectation is that the arguments are from node and have the application as argv[0]
       * and the script being run in argv[1], with user parameters after that.
       *
       * @example
       * program.parse(process.argv);
       * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {Object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
       *
       * The default expectation is that the arguments are from node and have the application as argv[0]
       * and the script being run in argv[1], with user parameters after that.
       *
       * @example
       * await program.parseAsync(process.argv);
       * await program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {Object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @api private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
            if (legacyName !== this._name) {
              localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess2.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess2.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess2.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        if (!exitCallback) {
          proc.on("close", process2.exit.bind(process2));
        } else {
          proc.on("close", () => {
            exitCallback(new CommanderError2(process2.exitCode || 0, "commander.executeSubCommandAsync", "(close)"));
          });
        }
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(1, "commander.executeSubCommandAsync", "(error)");
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @api private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @api private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(subcommandName, [], [
          this._helpLongFlag || this._helpShortFlag
        ]);
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @api private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @api private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {Promise|undefined} promise
       * @param {Function} fn
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {Promise|undefined} promise
       * @param {string} event
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {Promise|undefined} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {Promise|undefined}
       * @api private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @api private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._hasImplicitHelpCommand() && operands[0] === this._helpCommandName) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          outputHelpIfRequested(this, unknown);
          return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        outputHelpIfRequested(this, parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @api private
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @api private
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @api private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @api private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter(
          (option) => {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0) {
              return false;
            }
            return this.getOptionValueSource(optionKey) !== "default";
          }
        );
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @api private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {String[]} argv
       * @return {{operands: String[], unknown: String[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (arg === this._helpCommandName && this._hasImplicitHelpCommand()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {Object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {Object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {Object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @api private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @api private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter((option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @api private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @api private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @api private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @api private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
          const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @api private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @api private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @api private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {this | string | undefined} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this.options.push(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {Object} [argsDescription]
       * @return {string|Command}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0) return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {string|Command}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {string|Command}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name) throw new Error("Command alias can't be the same as its name");
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {string[]|Command}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {String|Command}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._hasHelpOption ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {string|Command}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {string|null|Command}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @api private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._helpLongFlag) {
          this.emit(this._helpLongFlag);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
      }
      /**
       * You can pass in flags and a description to override the help
       * flags and help description for your command. Pass in false to
       * disable the built-in help option.
       *
       * @param {string | boolean} [flags]
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          this._hasHelpOption = flags;
          return this;
        }
        this._helpFlags = flags || this._helpFlags;
        this._helpDescription = description || this._helpDescription;
        const helpFlags = splitOptionFlags(this._helpFlags);
        this._helpShortFlag = helpFlags.shortFlag;
        this._helpLongFlag = helpFlags.longFlag;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {string | Function} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
    };
    function outputHelpIfRequested(cmd, args) {
      const helpOption = cmd._hasHelpOption && args.find((arg) => arg === cmd._helpLongFlag || arg === cmd._helpShortFlag);
      if (helpOption) {
        cmd.outputHelp();
        cmd._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports2.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports2, module2) {
    "use strict";
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports2 = module2.exports = new Command2();
    exports2.program = exports2;
    exports2.Command = Command2;
    exports2.Option = Option2;
    exports2.Argument = Argument2;
    exports2.Help = Help2;
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
    exports2.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/dotenv/config.js
(function() {
  require_main().config(
    Object.assign(
      {},
      require_env_options(),
      require_cli_options()(process.argv)
    )
  );
})();

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/commands/auth.ts
var import_promises2 = require("readline/promises");

// src/core/session-store.ts
var import_node_crypto = require("crypto");
var import_promises = require("fs/promises");
var import_node_os = require("os");
var import_node_path = require("path");

// src/input/validators.ts
var STATE_DIR_ENV = "POCKETBASE_CLI_STATE_DIR";
var BASE_URL_ENV = "POCKETBASE_CLI_BASE_URL";
var DEFAULT_STATE_DIR = "~/.cache/pocketbase-cli";
var DEFAULT_SESSION_PATH = "session.json";
var ALLOWED_BASE_URL_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
var LOCAL_HTTP_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]"]);
var BASE_URL_PROTOCOL_ERROR = "expects an absolute https:// URL, or http:// for localhost, 127.0.0.1, or [::1]";
var INT_CONFIG_KEYS = /* @__PURE__ */ new Set(["timeout"]);
var ALLOWED_CONFIG_KEYS = /* @__PURE__ */ new Set([
  "base_url",
  "auth_collection",
  "timeout"
]);
function isConfigKey(value) {
  return ALLOWED_CONFIG_KEYS.has(value);
}
function parseBaseUrlValue(name, raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${name} expects a non-empty URL`);
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${name} ${BASE_URL_PROTOCOL_ERROR}`);
  }
  if (!ALLOWED_BASE_URL_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    throw new Error(`${name} ${BASE_URL_PROTOCOL_ERROR}`);
  }
  if (parsed.protocol === "http:" && !LOCAL_HTTP_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`${name} ${BASE_URL_PROTOCOL_ERROR}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${name} must not include embedded credentials`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${name} must not include query parameters or fragments`);
  }
  const pathname = parsed.pathname.replace(/\/+$/u, "");
  return `${parsed.origin}${pathname === "/" ? "" : pathname}`;
}
function parseConfigValue(key, raw) {
  if (!isConfigKey(key)) {
    throw new Error(`Unknown config key: ${key}`);
  }
  const lowered = raw.trim().toLowerCase();
  if (lowered === "none" || lowered === "null" || lowered === "unset") {
    return null;
  }
  if (INT_CONFIG_KEYS.has(key)) {
    return parseIntegerOptionValue(key, raw, { min: 1 });
  }
  if (key === "base_url") {
    return parseBaseUrlValue("base_url", raw);
  }
  return raw.trim();
}
function readEnvConfig(env = process.env) {
  const raw = env[BASE_URL_ENV];
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }
  try {
    return {
      base_url: parseBaseUrlValue(BASE_URL_ENV, raw.trim())
    };
  } catch (error) {
    return {
      base_url_error: error instanceof Error ? error.message : String(error)
    };
  }
}
function quoteForHistory(value) {
  if (!value || /[\s"'\\]/u.test(value)) {
    return `'${value.replace(/'/gu, `'\\''`)}'`;
  }
  return value;
}
function parseIntegerOptionValue(name, raw, options) {
  const trimmed = raw.trim();
  if (!/^-?\d+$/u.test(trimmed)) {
    throw new Error(`${name} expects an integer value`);
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} expects an integer value`);
  }
  if (options?.min !== void 0 && value < options.min) {
    if (options.min === 1 && options.max === void 0) {
      throw new Error(`${name} expects a positive integer value`);
    }
    if (options.min === 0 && options.max === void 0) {
      throw new Error(`${name} expects a non-negative integer value`);
    }
    throw new Error(`${name} expects an integer value greater than or equal to ${options.min}`);
  }
  if (options?.max !== void 0 && value > options.max) {
    throw new Error(`${name} expects an integer value less than or equal to ${options.max}`);
  }
  return value;
}

// src/core/session-store.ts
var SESSION_ENCRYPTION_FORMAT = "pocketbase-cli.session.encrypted/v1";
var SESSION_ENCRYPTION_ALGORITHM = "aes-256-gcm";
var SESSION_ENCRYPTION_KEY_BYTES = 32;
var SESSION_ENCRYPTION_IV_BYTES = 12;
var SESSION_ENCRYPTION_TAG_BYTES = 16;
var SESSION_LOCK_TIMEOUT_MS = 5e3;
var SESSION_LOCK_POLL_MS = 25;
var SESSION_LOCK_STALE_MS = 3e4;
var SESSION_LOCK_HEARTBEAT_MS = 5e3;
function expandHomePath(value) {
  return value.startsWith("~/") ? (0, import_node_path.join)((0, import_node_os.homedir)(), value.slice(2)) : value;
}
function isEncryptedSessionEnvelope(value) {
  if (!isRecord(value)) {
    return false;
  }
  return value.format === SESSION_ENCRYPTION_FORMAT && typeof value.algorithm === "string" && typeof value.iv === "string" && typeof value.tag === "string" && typeof value.ciphertext === "string";
}
function decodeBase64Field(name, value, expectedLength) {
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0 || expectedLength !== void 0 && decoded.length !== expectedLength) {
    throw new Error(`Invalid ${name} in encrypted session state.`);
  }
  return decoded;
}
function encryptSessionSnapshot(snapshot, key) {
  const iv = (0, import_node_crypto.randomBytes)(SESSION_ENCRYPTION_IV_BYTES);
  const cipher = (0, import_node_crypto.createCipheriv)(SESSION_ENCRYPTION_ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(snapshot), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    format: SESSION_ENCRYPTION_FORMAT,
    algorithm: SESSION_ENCRYPTION_ALGORITHM,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}
function decryptSessionEnvelope(path, envelope, key) {
  if (envelope.algorithm !== SESSION_ENCRYPTION_ALGORITHM) {
    throw new Error(
      `Failed to decrypt session state at ${path}. Unsupported encryption algorithm: ${envelope.algorithm}.`
    );
  }
  try {
    const iv = decodeBase64Field("IV", envelope.iv, SESSION_ENCRYPTION_IV_BYTES);
    const tag = decodeBase64Field("auth tag", envelope.tag, SESSION_ENCRYPTION_TAG_BYTES);
    const ciphertext = decodeBase64Field("ciphertext", envelope.ciphertext);
    const decipher = (0, import_node_crypto.createDecipheriv)(SESSION_ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const payload = JSON.parse(plaintext);
    return isRecord(payload) ? SessionState.fromJSON(payload) : new SessionState();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse decrypted session state at ${path}.`);
    }
    throw new Error(
      `Failed to decrypt session state at ${path}. Delete both the session file and its key file if you want to start with a clean state.`
    );
  }
}
async function writePrivateFileAtomic(path, data) {
  await (0, import_promises.mkdir)((0, import_node_path.dirname)(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await (0, import_promises.writeFile)(tempPath, data, {
    encoding: "utf8",
    mode: 384
  });
  await (0, import_promises.rename)(tempPath, path);
  try {
    await (0, import_promises.chmod)(path, 384);
  } catch {
  }
}
function deepClone(value) {
  if (value === void 0) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}
function cloneSnapshot(snapshot) {
  return {
    config: { ...snapshot.config },
    remote_auth: deepClone(snapshot.remote_auth),
    command_history: [...snapshot.command_history],
    undo_stack: deepClone(snapshot.undo_stack),
    redo_stack: deepClone(snapshot.redo_stack)
  };
}
function areSameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function findSequenceOverlap(base, current) {
  const maxOverlap = Math.min(base.length, current.length);
  for (let overlap = maxOverlap; overlap >= 0; overlap -= 1) {
    const baseSlice = base.slice(base.length - overlap);
    const currentSlice = current.slice(0, overlap);
    if (areSameValue(baseSlice, currentSlice)) {
      return overlap;
    }
  }
  return 0;
}
function trimCommandHistory(history, maxHistory) {
  const overflow = history.length - maxHistory;
  return overflow > 0 ? history.slice(overflow) : [...history];
}
function mergeConfigState(base, latest, current) {
  const merged = {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(base), ...Object.keys(latest), ...Object.keys(current)]);
  for (const rawKey of keys) {
    const key = rawKey;
    const baseValue = base[key];
    const latestValue = latest[key];
    const currentValue = current[key];
    const mergedValue = areSameValue(currentValue, baseValue) ? latestValue : currentValue;
    if (mergedValue !== void 0 && mergedValue !== null) {
      merged[key] = mergedValue;
    }
  }
  return merged;
}
function mergeRemoteAuthState(base, latest, current) {
  return areSameValue(current, base) ? deepClone(latest) : deepClone(current);
}
function mergeCommandHistory(base, latest, current, maxHistory) {
  if (areSameValue(current, base)) {
    return trimCommandHistory(latest, maxHistory);
  }
  const overlap = findSequenceOverlap(base, current);
  const localAppends = current.slice(overlap);
  if (localAppends.length === 0) {
    return trimCommandHistory(latest, maxHistory);
  }
  return trimCommandHistory([...latest, ...localAppends], maxHistory);
}
function mergeChangeStack(base, latest, current) {
  if (areSameValue(current, base)) {
    return deepClone(latest);
  }
  if (current.length >= base.length && areSameValue(current.slice(0, base.length), base)) {
    return [...deepClone(latest), ...deepClone(current.slice(base.length))];
  }
  return deepClone(current);
}
function mergeSessionSnapshots(options) {
  return {
    config: mergeConfigState(options.base.config, options.latest.config, options.current.config),
    remote_auth: mergeRemoteAuthState(
      options.base.remote_auth,
      options.latest.remote_auth,
      options.current.remote_auth
    ),
    command_history: mergeCommandHistory(
      options.base.command_history,
      options.latest.command_history,
      options.current.command_history,
      options.maxHistory
    ),
    undo_stack: mergeChangeStack(
      options.base.undo_stack,
      options.latest.undo_stack,
      options.current.undo_stack
    ),
    redo_stack: mergeChangeStack(
      options.base.redo_stack,
      options.latest.redo_stack,
      options.current.redo_stack
    )
  };
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var SessionState = class _SessionState {
  constructor(options) {
    this.config = { ...options?.config ?? {} };
    this.remoteAuth = { ...options?.remoteAuth ?? {} };
    this.commandHistory = [...options?.commandHistory ?? []];
    this.undoStack = [...options?.undoStack ?? []];
    this.redoStack = [...options?.redoStack ?? []];
    this.maxHistory = options?.maxHistory ?? 200;
    this.persistedSnapshot = this.toJSON();
  }
  recordCommand(commandLine) {
    const normalized = commandLine.trim();
    if (!normalized) {
      return;
    }
    this.commandHistory.push(normalized);
    const overflow = this.commandHistory.length - this.maxHistory;
    if (overflow > 0) {
      this.commandHistory.splice(0, overflow);
    }
  }
  setConfig(key, value) {
    const oldValue = this.config[key] ?? null;
    if (oldValue === value) {
      return {
        changed: false,
        key,
        old: oldValue,
        new: value
      };
    }
    const change = {
      key,
      old: oldValue,
      new: value
    };
    if (value === null) {
      delete this.config[key];
    } else {
      this.config[key] = value;
    }
    this.undoStack.push(change);
    this.redoStack = [];
    return {
      changed: true,
      ...change
    };
  }
  unsetConfig(key) {
    return this.setConfig(key, null);
  }
  undo() {
    const change = this.undoStack.pop();
    if (!change) {
      throw new Error("Nothing to undo");
    }
    const key = change.key;
    const oldValue = change.old ?? null;
    if (oldValue === null) {
      delete this.config[key];
    } else {
      this.config[key] = oldValue;
    }
    this.redoStack.push(change);
    return {
      key,
      value: oldValue,
      change
    };
  }
  redo() {
    const change = this.redoStack.pop();
    if (!change) {
      throw new Error("Nothing to redo");
    }
    const key = change.key;
    const newValue = change.new ?? null;
    if (newValue === null) {
      delete this.config[key];
    } else {
      this.config[key] = newValue;
    }
    this.undoStack.push(change);
    return {
      key,
      value: newValue,
      change
    };
  }
  setRemoteAuth(options) {
    this.remoteAuth = {
      base_url: options.baseUrl.replace(/\/+$/, ""),
      token: options.token,
      record: { ...options.record ?? {} },
      collection: options.collection ?? "_superusers"
    };
    return { ...this.remoteAuth };
  }
  clearRemoteAuth() {
    this.remoteAuth = {};
  }
  hasRemoteAuth() {
    return Boolean(this.remoteAuth.base_url && this.remoteAuth.token);
  }
  toJSON() {
    return cloneSnapshot({
      config: { ...this.config },
      remote_auth: deepClone(this.remoteAuth),
      command_history: [...this.commandHistory],
      undo_stack: deepClone(this.undoStack),
      redo_stack: deepClone(this.redoStack)
    });
  }
  getPersistedSnapshot() {
    return cloneSnapshot(this.persistedSnapshot);
  }
  replaceWithSnapshot(snapshot) {
    this.config = { ...snapshot.config };
    this.remoteAuth = deepClone(snapshot.remote_auth);
    this.commandHistory = [...snapshot.command_history];
    this.undoStack = deepClone(snapshot.undo_stack);
    this.redoStack = deepClone(snapshot.redo_stack);
    this.persistedSnapshot = cloneSnapshot(snapshot);
  }
  static fromJSON(raw) {
    return new _SessionState({
      config: isRecord(raw.config) ? raw.config : {},
      remoteAuth: isRecord(raw.remote_auth) ? raw.remote_auth : {},
      commandHistory: Array.isArray(raw.command_history) ? raw.command_history.map(String) : [],
      undoStack: Array.isArray(raw.undo_stack) ? raw.undo_stack.filter(isRecord) : [],
      redoStack: Array.isArray(raw.redo_stack) ? raw.redo_stack.filter(isRecord) : []
    });
  }
};
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
var SessionStore = class {
  constructor(path) {
    const configuredDir = process.env[STATE_DIR_ENV];
    const baseDir = expandHomePath(configuredDir ?? DEFAULT_STATE_DIR);
    this.path = path ?? (0, import_node_path.join)(baseDir, DEFAULT_SESSION_PATH);
    this.keyPath = `${this.path}.key`;
    this.lockPath = `${this.path}.lock`;
    this.lockOwnerPath = (0, import_node_path.join)(this.lockPath, "owner.json");
  }
  async load() {
    return this.readStateFromDisk();
  }
  async save(state) {
    await this.withLock(async () => {
      const key = await this.loadEncryptionKey(true);
      const latest = await this.readStateFromDisk();
      const merged = mergeSessionSnapshots({
        base: state.getPersistedSnapshot(),
        latest: latest.toJSON(),
        current: state.toJSON(),
        maxHistory: state.maxHistory
      });
      const encrypted = encryptSessionSnapshot(merged, key);
      await writePrivateFileAtomic(this.path, JSON.stringify(encrypted, null, 2));
      state.replaceWithSnapshot(merged);
    });
  }
  async readStateFromDisk() {
    try {
      const raw = await (0, import_promises.readFile)(this.path, "utf8");
      const payload = JSON.parse(raw);
      if (!isRecord(payload)) {
        return new SessionState();
      }
      if (isEncryptedSessionEnvelope(payload)) {
        const key = await this.loadEncryptionKey(false);
        return decryptSessionEnvelope(this.path, payload, key);
      }
      return SessionState.fromJSON(payload);
    } catch (error) {
      if (error.code === "ENOENT") {
        return new SessionState();
      }
      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to parse session state at ${this.path}. Fix or remove the corrupted file and try again.`
        );
      }
      throw error;
    }
  }
  async loadEncryptionKey(createIfMissing) {
    try {
      const raw = (await (0, import_promises.readFile)(this.keyPath, "utf8")).trim();
      return decodeBase64Field("encryption key", raw, SESSION_ENCRYPTION_KEY_BYTES);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      if (!createIfMissing) {
        throw new Error(
          `Failed to decrypt session state at ${this.path}. Missing encryption key at ${this.keyPath}.`
        );
      }
    }
    const key = (0, import_node_crypto.randomBytes)(SESSION_ENCRYPTION_KEY_BYTES);
    await writePrivateFileAtomic(this.keyPath, key.toString("base64"));
    return key;
  }
  async withLock(operation) {
    const ownerId = await this.acquireLock();
    const stopHeartbeat = this.startLockHeartbeat(ownerId);
    try {
      return await operation();
    } finally {
      stopHeartbeat();
      await this.releaseLock(ownerId);
    }
  }
  async acquireLock() {
    await (0, import_promises.mkdir)((0, import_node_path.dirname)(this.path), { recursive: true });
    const startedAt = Date.now();
    for (; ; ) {
      try {
        await (0, import_promises.mkdir)(this.lockPath);
        const ownerId = `${process.pid}-${Date.now()}-${(0, import_node_crypto.randomBytes)(8).toString("hex")}`;
        try {
          await this.writeLockOwner(ownerId);
        } catch (error) {
          await (0, import_promises.rm)(this.lockPath, {
            recursive: true,
            force: true
          });
          throw error;
        }
        return ownerId;
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw error;
        }
        if (await this.clearStaleLock()) {
          continue;
        }
        if (Date.now() - startedAt >= SESSION_LOCK_TIMEOUT_MS) {
          throw new Error(`Timed out acquiring session lock at ${this.lockPath}.`);
        }
        await delay(SESSION_LOCK_POLL_MS);
      }
    }
  }
  async clearStaleLock() {
    try {
      const lockStats = await (0, import_promises.stat)(this.lockPath);
      const ownerStats = await (0, import_promises.stat)(this.lockOwnerPath).catch((error) => {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      });
      const lastHeartbeatMs = ownerStats?.mtimeMs ?? lockStats.mtimeMs;
      if (Date.now() - lastHeartbeatMs < SESSION_LOCK_STALE_MS) {
        return false;
      }
      await (0, import_promises.rm)(this.lockPath, {
        recursive: true,
        force: true
      });
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return true;
      }
      throw error;
    }
  }
  async releaseLock(ownerId) {
    const ownerRecord = await this.readLockOwner().catch((error) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    });
    if (!ownerRecord || ownerRecord.id !== ownerId) {
      return;
    }
    await (0, import_promises.rm)(this.lockPath, {
      recursive: true,
      force: true
    });
  }
  startLockHeartbeat(ownerId) {
    const timer = setInterval(() => {
      void this.writeLockOwner(ownerId).catch(() => {
      });
    }, SESSION_LOCK_HEARTBEAT_MS);
    timer.unref?.();
    return () => {
      clearInterval(timer);
    };
  }
  async writeLockOwner(ownerId) {
    const payload = {
      id: ownerId,
      pid: process.pid,
      heartbeat_at: Date.now()
    };
    await (0, import_promises.writeFile)(this.lockOwnerPath, JSON.stringify(payload), {
      encoding: "utf8",
      mode: 384
    });
  }
  async readLockOwner() {
    const raw = await (0, import_promises.readFile)(this.lockOwnerPath, "utf8");
    const payload = JSON.parse(raw);
    if (!isRecord(payload) || typeof payload.id !== "string" || typeof payload.pid !== "number" || typeof payload.heartbeat_at !== "number") {
      return null;
    }
    return {
      id: payload.id,
      pid: payload.pid,
      heartbeat_at: payload.heartbeat_at
    };
  }
};

// package.json
var package_default = {
  name: "pocketbase-cli",
  version: "0.1.7",
  description: "Remote-only PocketBase CLI (TypeScript)",
  license: "MIT",
  type: "commonjs",
  files: [
    "dist",
    "README.md",
    "README.en.md",
    "README.zh-CN.md"
  ],
  bin: {
    "pocketbase-cli": "./dist/bin.js"
  },
  scripts: {
    build: "tsup",
    typecheck: "tsc --noEmit",
    lint: "eslint src test",
    prepack: "npm run build",
    test: "vitest run",
    clean: "rm -rf dist",
    dev: "tsup --watch"
  },
  engines: {
    node: ">=20"
  },
  dependencies: {
    commander: "^11.0.0",
    dotenv: "^16.4.7"
  },
  devDependencies: {
    "@eslint/js": "^9.39.4",
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.57.2",
    "@typescript-eslint/parser": "^8.57.2",
    eslint: "^9.39.4",
    globals: "^17.4.0",
    tsup: "^8.5.1",
    typescript: "^5.5.0",
    vitest: "^4.1.2"
  }
};

// src/core/version.ts
var CLI_VERSION = package_default.version;
var CLI_USER_AGENT = `pocketbase-cli/${CLI_VERSION}`;

// src/http/remote-client.ts
var import_node_fs = require("fs");
var import_node_path2 = require("path");
var import_node_crypto2 = require("crypto");
var AUTH_TOKEN_MISSING_MESSAGE = "Remote auth token is missing. Run `auth login` first.";
var MULTIPART_TEXT_ENCODER = new TextEncoder();
var REDACTED_SECRET = "********";
var SENSITIVE_QUERY_KEYS = /* @__PURE__ */ new Set([
  "token",
  "access_token",
  "refresh_token",
  "code_verifier",
  "signature",
  "sig",
  "x-amz-signature",
  "x-amz-credential",
  "x-amz-security-token"
]);
var PocketBaseRemoteError = class extends Error {
  constructor(options) {
    super(sanitizeRemoteMessage(options.message));
    this.method = options.method;
    this.url = options.url;
    this.status = options.status;
    this.data = options.data ?? {};
  }
  toJSON() {
    return {
      method: this.method,
      url: sanitizeUrlForOutput(this.url),
      status: this.status,
      data: sanitizeRemoteValue(this.data)
    };
  }
};
function quotePathSegment(value) {
  return encodeURIComponent(value);
}
function coerceFormValues(value) {
  if (value === null || value === void 0) {
    return [];
  }
  if (typeof value === "boolean") {
    return [value ? "true" : "false"];
  }
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }
  return [JSON.stringify(value)];
}
function decodeJson(raw) {
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
function extractErrorMessage(payload, raw, fallback) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (raw.trim()) {
    return raw.trim();
  }
  return fallback;
}
function sanitizeUrlForOutput(url) {
  try {
    const parsed = new URL(url);
    for (const key of SENSITIVE_QUERY_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, REDACTED_SECRET);
      }
    }
    return parsed.toString();
  } catch {
    return url.replace(
      /([?&](?:token|access_token|refresh_token|code_verifier|signature|sig|x-amz-signature|x-amz-credential|x-amz-security-token)=)[^&#]+/giu,
      `$1${REDACTED_SECRET}`
    );
  }
}
function normalizeSensitiveKey(key) {
  return key.replace(/[^a-z0-9]/giu, "").toLowerCase();
}
function isSensitiveOutputKey(key) {
  const normalized = normalizeSensitiveKey(key);
  return normalized === "authorization" || normalized.endsWith("token") || normalized.endsWith("password") || normalized.endsWith("secret") || normalized.endsWith("privatekey") || normalized.endsWith("clientsecret") || normalized.endsWith("apikey") || normalized.endsWith("accesskey") || normalized.endsWith("secretkey");
}
function sanitizeStringForOutput(value) {
  if (/[?&](?:token|access_token|refresh_token|code_verifier|signature|sig|x-amz-signature|x-amz-credential|x-amz-security-token)=/iu.test(
    value
  )) {
    return sanitizeUrlForOutput(value);
  }
  return value;
}
function sanitizeRemoteMessage(value) {
  return sanitizeStringForOutput(value).replace(
    /\b(authorization|token|access[_-]?token|accessToken|refresh[_-]?token|refreshToken|code[_-]?verifier|codeVerifier|password|secret|private[_-]?key|privateKey|client[_-]?secret|clientSecret|api[_-]?key|apiKey|access[_-]?key|accessKey|secret[_-]?key|secretKey)\b(\s*[:=]\s*)(["']?)(?:Bearer\s+)?[^"',\s&}]+/giu,
    `$1$2$3${REDACTED_SECRET}`
  );
}
function sanitizeRemoteValue(value, key) {
  if (typeof value === "string") {
    if (key && isSensitiveOutputKey(key)) {
      return REDACTED_SECRET;
    }
    return sanitizeStringForOutput(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRemoteValue(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeRemoteValue(entryValue, entryKey)
    ])
  );
}
function sanitizeRemoteResult(result) {
  return {
    ...result,
    url: sanitizeUrlForOutput(result.url),
    data: sanitizeRemoteValue(result.data)
  };
}
function encodeMultipartChunk(value) {
  return MULTIPART_TEXT_ENCODER.encode(value);
}
function escapeMultipartDispositionValue(value) {
  return value.replace(/[\r\n]+/gu, " ").replace(/"/gu, "%22");
}
async function* createMultipartBodyStream(options) {
  const boundaryPrefix = `--${options.boundary}\r
`;
  for (const [fieldName, value] of Object.entries(options.body)) {
    const escapedFieldName = escapeMultipartDispositionValue(fieldName);
    for (const renderedValue of coerceFormValues(value)) {
      yield encodeMultipartChunk(boundaryPrefix);
      yield encodeMultipartChunk(
        `Content-Disposition: form-data; name="${escapedFieldName}"\r
\r
${renderedValue}\r
`
      );
    }
  }
  for (const fileField of options.fileFields) {
    const escapedFieldName = escapeMultipartDispositionValue(fileField.fieldName);
    const filename = (0, import_node_path2.basename)(fileField.filePath);
    const escapedFilename = escapeMultipartDispositionValue(filename);
    yield encodeMultipartChunk(boundaryPrefix);
    yield encodeMultipartChunk(
      `Content-Disposition: form-data; name="${escapedFieldName}"; filename="${escapedFilename}"\r
`
    );
    yield encodeMultipartChunk(
      `Content-Type: ${fileField.contentType ?? "application/octet-stream"}\r
\r
`
    );
    for await (const chunk of (0, import_node_fs.createReadStream)(fileField.filePath)) {
      yield typeof chunk === "string" ? encodeMultipartChunk(chunk) : chunk;
    }
    yield encodeMultipartChunk("\r\n");
  }
  yield encodeMultipartChunk(`--${options.boundary}--\r
`);
}
var PocketBaseRemoteClient = class {
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token ?? null;
    this.collection = options.collection ?? "_superusers";
    this.timeout = options.timeout ?? null;
    this.userAgent = options.userAgent ?? CLI_USER_AGENT;
  }
  login(options) {
    return this.request("POST", this.collectionPath(this.collection, "auth-with-password"), {
      body: {
        identity: options.identity,
        password: options.password
      }
    });
  }
  refresh() {
    return this.request("POST", this.collectionPath(this.collection, "auth-refresh"), {
      requireAuth: true
    });
  }
  recordAuthMethods(collection) {
    return this.request("GET", this.collectionPath(collection, "auth-methods"), {
      requireAuth: false
    });
  }
  recordAuthPassword(options) {
    const body = {
      identity: options.identity,
      password: options.password
    };
    if (options.identityField) {
      body.identityField = options.identityField;
    }
    if (options.mfaId) {
      body.mfaId = options.mfaId;
    }
    return this.request("POST", this.collectionPath(options.collection, "auth-with-password"), {
      body,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: false,
      allowedStatuses: /* @__PURE__ */ new Set([401])
    });
  }
  recordAuthOauth2(options) {
    const body = {
      provider: options.provider,
      code: options.code,
      redirectURL: options.redirectUrl
    };
    if (options.codeVerifier) {
      body.codeVerifier = options.codeVerifier;
    }
    if (options.createData !== void 0 && options.createData !== null) {
      body.createData = options.createData;
    }
    return this.request("POST", this.collectionPath(options.collection, "auth-with-oauth2"), {
      body,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: false,
      allowedStatuses: /* @__PURE__ */ new Set([401])
    });
  }
  recordAuthRefresh(options) {
    return this.request("POST", this.collectionPath(options.collection, "auth-refresh"), {
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: true
    });
  }
  recordRequestOtp(options) {
    return this.request("POST", this.collectionPath(options.collection, "request-otp"), {
      body: {
        email: options.email
      },
      requireAuth: false
    });
  }
  recordAuthOtp(options) {
    const body = {
      otpId: options.otpId,
      password: options.password
    };
    if (options.mfaId) {
      body.mfaId = options.mfaId;
    }
    return this.request("POST", this.collectionPath(options.collection, "auth-with-otp"), {
      body,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: false,
      allowedStatuses: /* @__PURE__ */ new Set([401])
    });
  }
  recordRequestPasswordReset(options) {
    return this.request("POST", this.collectionPath(options.collection, "request-password-reset"), {
      body: {
        email: options.email
      },
      requireAuth: false
    });
  }
  recordConfirmPasswordReset(options) {
    return this.request("POST", this.collectionPath(options.collection, "confirm-password-reset"), {
      body: {
        token: options.token,
        password: options.password,
        passwordConfirm: options.passwordConfirm
      },
      requireAuth: false
    });
  }
  recordRequestVerification(options) {
    return this.request("POST", this.collectionPath(options.collection, "request-verification"), {
      body: {
        email: options.email
      },
      requireAuth: false
    });
  }
  recordConfirmVerification(options) {
    return this.request("POST", this.collectionPath(options.collection, "confirm-verification"), {
      body: {
        token: options.token
      },
      requireAuth: false
    });
  }
  recordRequestEmailChange(options) {
    return this.request("POST", this.collectionPath(options.collection, "request-email-change"), {
      body: {
        newEmail: options.newEmail
      },
      requireAuth: true
    });
  }
  recordConfirmEmailChange(options) {
    return this.request("POST", this.collectionPath(options.collection, "confirm-email-change"), {
      body: {
        token: options.token,
        password: options.password
      },
      requireAuth: false
    });
  }
  recordImpersonate(options) {
    return this.request(
      "POST",
      this.collectionPath(options.collection, "impersonate", options.recordId),
      {
        body: options.duration !== void 0 && options.duration !== null ? { duration: options.duration } : void 0,
        query: this.recordQuery(options.fields, options.expand),
        requireAuth: true
      }
    );
  }
  collectionsList(options) {
    return this.request("GET", "/api/collections", {
      query: this.listQuery(options),
      requireAuth: true
    });
  }
  collectionsGet(nameOrId) {
    return this.request("GET", this.collectionPath(nameOrId), {
      requireAuth: true
    });
  }
  collectionsCreate(options) {
    return this.request("POST", "/api/collections", {
      body: options.body,
      requireAuth: true
    });
  }
  collectionsUpdate(options) {
    return this.request("PATCH", this.collectionPath(options.nameOrId), {
      body: options.body,
      requireAuth: true
    });
  }
  collectionsDelete(nameOrId) {
    return this.request("DELETE", this.collectionPath(nameOrId), {
      requireAuth: true
    });
  }
  collectionsTruncate(nameOrId) {
    return this.request("DELETE", this.collectionPath(nameOrId, "truncate"), {
      requireAuth: true
    });
  }
  collectionsImport(options) {
    return this.request("PUT", "/api/collections/import", {
      body: options.body,
      requireAuth: true
    });
  }
  collectionsScaffolds() {
    return this.request("GET", "/api/collections/meta/scaffolds", {
      requireAuth: true
    });
  }
  settingsGet() {
    return this.request("GET", "/api/settings", {
      requireAuth: true
    });
  }
  settingsPatch(options) {
    return this.request("PATCH", "/api/settings", {
      body: options.body,
      requireAuth: true
    });
  }
  settingsTestS3(options) {
    return this.request("POST", "/api/settings/test/s3", {
      body: options.body,
      requireAuth: true
    });
  }
  settingsTestEmail(options) {
    return this.request("POST", "/api/settings/test/email", {
      body: options.body,
      requireAuth: true
    });
  }
  settingsGenerateAppleClientSecret(options) {
    return this.request("POST", "/api/settings/apple/generate-client-secret", {
      body: options.body,
      requireAuth: true
    });
  }
  logsList(options) {
    return this.request("GET", "/api/logs", {
      query: this.listQuery(options),
      requireAuth: true
    });
  }
  logsGet(logId) {
    return this.request("GET", `/api/logs/${quotePathSegment(logId)}`, {
      requireAuth: true
    });
  }
  logsStats(options) {
    return this.request("GET", "/api/logs/stats", {
      query: {
        filter: options?.filterValue ?? void 0
      },
      requireAuth: true
    });
  }
  cronsList() {
    return this.request("GET", "/api/crons", {
      requireAuth: true
    });
  }
  cronsRun(jobId) {
    return this.request("POST", `/api/crons/${quotePathSegment(jobId)}`, {
      requireAuth: true
    });
  }
  recordsList(options) {
    return this.request("GET", this.collectionPath(options.collection, "records"), {
      query: {
        ...this.listQuery(options),
        ...this.recordQuery(options.fields, options.expand)
      },
      requireAuth: true
    });
  }
  recordsGet(options) {
    return this.request("GET", this.recordPath(options.collection, options.recordId), {
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: true
    });
  }
  recordsCreate(options) {
    return this.request("POST", this.collectionPath(options.collection, "records"), {
      body: options.body,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: true
    });
  }
  async recordsCreateWithFiles(options) {
    return this.requestMultipart("POST", this.collectionPath(options.collection, "records"), {
      body: options.body,
      fileFields: options.fileFields,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: true
    });
  }
  recordsUpdate(options) {
    return this.request("PATCH", this.recordPath(options.collection, options.recordId), {
      body: options.body,
      query: this.recordQuery(options.fields, options.expand),
      requireAuth: true
    });
  }
  async recordsUpdateWithFiles(options) {
    return this.requestMultipart(
      "PATCH",
      this.recordPath(options.collection, options.recordId),
      {
        body: options.body,
        fileFields: options.fileFields,
        query: this.recordQuery(options.fields, options.expand),
        requireAuth: true
      }
    );
  }
  recordsDelete(options) {
    return this.request("DELETE", this.recordPath(options.collection, options.recordId), {
      requireAuth: true
    });
  }
  filesToken() {
    return this.request("POST", "/api/files/token", {
      requireAuth: true
    });
  }
  batchRun(options) {
    return this.request("POST", "/api/batch", {
      body: options.body,
      requireAuth: true
    });
  }
  sqlRun(options) {
    return this.request("POST", "/api/sql", {
      body: {
        query: options.query
      },
      requireAuth: true
    });
  }
  backupsList() {
    return this.request("GET", "/api/backups", {
      requireAuth: true
    });
  }
  backupsCreate(options) {
    return this.request("POST", "/api/backups", {
      body: options.name ? { name: options.name } : void 0,
      requireAuth: true
    });
  }
  async backupsUpload(options) {
    const boundary = `pocketbase-cli-${(0, import_node_crypto2.randomBytes)(12).toString("hex")}`;
    return this.requestBody("POST", "/api/backups/upload", {
      body: createMultipartBodyStream({
        body: {},
        fileFields: [
          {
            fieldName: "file",
            filePath: options.filePath,
            contentType: "application/zip"
          }
        ],
        boundary
      }),
      requireAuth: true,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      duplex: "half"
    });
  }
  backupsDelete(name) {
    return this.request("DELETE", `/api/backups/${quotePathSegment(name)}`, {
      requireAuth: true
    });
  }
  backupsRestore(name) {
    return this.request("POST", `/api/backups/${quotePathSegment(name)}/restore`, {
      requireAuth: true
    });
  }
  backupsDownload(options) {
    return this.requestStream("GET", `/api/backups/${quotePathSegment(options.name)}`, {
      query: {
        token: options.token
      },
      requireAuth: false
    });
  }
  buildFileUrl(options) {
    const path = `/api/files/${quotePathSegment(options.collection)}/${quotePathSegment(
      options.recordId
    )}/${quotePathSegment(options.filename)}`;
    return this.buildUrl(path, {
      thumb: options.thumb ?? void 0,
      download: options.download ? 1 : void 0,
      token: options.token ?? void 0
    });
  }
  buildBackupUrl(options) {
    return this.buildUrl(`/api/backups/${quotePathSegment(options.name)}`, {
      token: options.token ?? void 0
    });
  }
  async raw(options) {
    return this.request(options.method.toUpperCase(), options.path, {
      body: options.body ?? void 0,
      requireAuth: options.requireAuth ?? false,
      includeAuth: options.includeAuth
    });
  }
  async request(method, path, options) {
    return this.requestBody(method, path, {
      body: options?.body === void 0 ? void 0 : JSON.stringify(options.body),
      query: options?.query,
      requireAuth: options?.requireAuth,
      includeAuth: options?.includeAuth,
      allowedStatuses: options?.allowedStatuses,
      headers: options?.body === void 0 ? void 0 : { "Content-Type": "application/json" }
    });
  }
  buildUrl(path, query) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const baseUrl = `${this.baseUrl}${normalizedPath}`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== void 0 && value !== null) {
        params.set(key, String(value));
      }
    }
    const renderedQuery = params.toString();
    return renderedQuery ? `${baseUrl}?${renderedQuery}` : baseUrl;
  }
  collectionPath(collection, ...segments) {
    const base = `/api/collections/${quotePathSegment(collection)}`;
    return segments.length === 0 ? base : `${base}/${segments.map(quotePathSegment).join("/")}`;
  }
  recordPath(collection, recordId, ...segments) {
    return this.collectionPath(collection, "records", recordId, ...segments);
  }
  recordQuery(fields, expand) {
    return {
      fields: fields ?? void 0,
      expand: expand ?? void 0
    };
  }
  listQuery(options) {
    return {
      page: options?.page,
      perPage: options?.perPage,
      filter: options?.filterValue ?? void 0,
      sort: options?.sort ?? void 0
    };
  }
  buildMultipartFormData(options) {
    const boundary = `pocketbase-cli-${(0, import_node_crypto2.randomBytes)(12).toString("hex")}`;
    return {
      body: createMultipartBodyStream({
        body: options.body,
        fileFields: options.fileFields,
        boundary
      }),
      boundary
    };
  }
  async requestMultipart(method, path, options) {
    const formData = this.buildMultipartFormData({
      body: options.body,
      fileFields: options.fileFields
    });
    return this.requestBody(method, path, {
      body: formData.body,
      query: options.query,
      requireAuth: options.requireAuth,
      includeAuth: options.includeAuth,
      allowedStatuses: options.allowedStatuses,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData.boundary}`
      },
      duplex: "half"
    });
  }
  createMissingAuthError(method, url) {
    return new PocketBaseRemoteError({
      method,
      url,
      status: 401,
      message: AUTH_TOKEN_MISSING_MESSAGE,
      data: {}
    });
  }
  wrapUnknownRequestError(method, url, error) {
    const message = error instanceof Error ? error.message : String(error);
    return new PocketBaseRemoteError({
      method,
      url,
      status: 0,
      message,
      data: {}
    });
  }
  async executeRequest(method, path, options, parseResponse) {
    return this.sendRequest(method, path, options, async (response, context) => {
      const parsed = await parseResponse(response);
      if (!response.ok && !options.allowedStatuses?.has(response.status)) {
        throw new PocketBaseRemoteError({
          method: context.method,
          url: context.url,
          status: response.status,
          message: parsed.errorMessage,
          data: parsed.errorData
        });
      }
      return parsed.data;
    });
  }
  async sendRequest(method, path, options, handleResponse) {
    const normalizedMethod = method.toUpperCase();
    const url = this.buildUrl(path, options.query);
    if ((options.requireAuth ?? false) && !this.token) {
      throw this.createMissingAuthError(normalizedMethod, url);
    }
    const headers = {
      Accept: options.accept,
      "User-Agent": this.userAgent,
      ...options.headers ?? {}
    };
    const includeAuth = options.includeAuth ?? options.requireAuth ?? false;
    if (includeAuth && this.token) {
      headers.Authorization = this.token;
    }
    const controller = new AbortController();
    const timeoutHandle = this.timeout !== null ? setTimeout(() => controller.abort(), this.timeout * 1e3) : null;
    try {
      const response = await fetch(
        url,
        {
          method: normalizedMethod,
          headers,
          body: options.body,
          duplex: options.duplex,
          signal: controller.signal
        }
      );
      const data = await handleResponse(response, {
        method: normalizedMethod,
        url
      });
      return {
        method: normalizedMethod,
        url,
        status: response.status,
        data
      };
    } catch (error) {
      if (error instanceof PocketBaseRemoteError) {
        throw error;
      }
      throw this.wrapUnknownRequestError(normalizedMethod, url, error);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
  async requestStream(method, path, options) {
    return this.sendRequest(
      method,
      path,
      { ...options, accept: "*/*" },
      async (response, context) => {
        if (!response.ok && !options?.allowedStatuses?.has(response.status)) {
          const responseText = await response.text();
          const errorData = decodeJson(responseText);
          throw new PocketBaseRemoteError({
            method: context.method,
            url: context.url,
            status: response.status,
            message: extractErrorMessage(errorData, responseText, response.statusText),
            data: errorData
          });
        }
        if (!response.body) {
          throw new PocketBaseRemoteError({
            method: context.method,
            url: context.url,
            status: response.status,
            message: "Remote response did not include a readable body.",
            data: {}
          });
        }
        return response.body;
      }
    );
  }
  async requestBody(method, path, options) {
    return this.executeRequest(
      method,
      path,
      { ...options, accept: "application/json" },
      async (response) => {
        const responseText = await response.text();
        const data = decodeJson(responseText);
        return {
          data,
          errorData: data,
          errorMessage: extractErrorMessage(data, responseText, response.statusText)
        };
      }
    );
  }
};

// src/app/context.ts
async function createAppContext() {
  const store = new SessionStore();
  const state = await store.load();
  const envConfig = readEnvConfig();
  return {
    version: CLI_VERSION,
    jsonMode: process.argv.includes("--json"),
    suppressHistory: false,
    onStateSaved: void 0,
    envConfig,
    store,
    state
  };
}
async function saveContextState(context) {
  await context.store.save(context.state);
  context.onStateSaved?.();
}
async function recordCommand(context, commandLine) {
  if (!context.suppressHistory) {
    context.state.recordCommand(commandLine);
    await saveContextState(context);
  }
}
function normalizeBaseUrl(value) {
  if (!value) {
    return null;
  }
  return String(value).replace(/\/+$/, "");
}
function clearRemoteAuthIfConfigTargetChanged(context) {
  if (!context.state.hasRemoteAuth()) {
    return {
      auth_cleared: false
    };
  }
  const configuredBaseUrl = normalizeBaseUrl(context.state.config.base_url ?? null);
  const configuredCollection = context.state.config.auth_collection ?? null;
  const remoteAuthBaseUrl = normalizeBaseUrl(context.state.remoteAuth.base_url ?? null);
  const remoteAuthCollection = String(context.state.remoteAuth.collection ?? "_superusers");
  const reasonKeys = [];
  if (configuredBaseUrl !== null && configuredBaseUrl !== remoteAuthBaseUrl) {
    reasonKeys.push("base_url");
  }
  if (configuredCollection !== null && configuredCollection !== remoteAuthCollection) {
    reasonKeys.push("auth_collection");
  }
  if (reasonKeys.length === 0) {
    return {
      auth_cleared: false
    };
  }
  context.state.clearRemoteAuth();
  return {
    auth_cleared: true,
    cleared_auth: {
      base_url: remoteAuthBaseUrl,
      collection: remoteAuthCollection,
      reason_keys: reasonKeys
    }
  };
}
function resolveBaseUrl(context, baseUrl) {
  const resolved = baseUrl ?? context.state.config.base_url ?? context.envConfig?.base_url ?? context.state.remoteAuth.base_url;
  if (!resolved) {
    return null;
  }
  return String(resolved).replace(/\/+$/, "");
}
function resolveAuthCollection(context, collection) {
  return String(
    collection ?? context.state.config.auth_collection ?? context.state.remoteAuth.collection ?? "_superusers"
  );
}
function buildAuthStatusPayload(context) {
  const remoteAuth = context.state.remoteAuth;
  return {
    authenticated: context.state.hasRemoteAuth(),
    configured_base_url: context.state.config.base_url ?? null,
    env_base_url: context.envConfig?.base_url ?? null,
    env_base_url_error: context.envConfig?.base_url_error ?? null,
    resolved_base_url: resolveBaseUrl(context),
    configured_auth_collection: context.state.config.auth_collection ?? "_superusers",
    active_base_url: remoteAuth.base_url ?? null,
    active_collection: remoteAuth.collection ?? null,
    record: sanitizeRemoteValue(remoteAuth.record ?? null)
  };
}

// src/contract/metadata.ts
function createArgumentParameter(options) {
  return {
    kind: "argument",
    name: options.name,
    required: options.required ?? true,
    nargs: options.nargs ?? 1,
    type: options.type ?? "TEXT",
    help: options.help,
    sensitive: options.sensitive ?? false
  };
}
function createOptionParameter(options) {
  return {
    kind: "option",
    name: options.name,
    names: [options.name],
    required: options.required ?? false,
    takes_value: !(options.isFlag ?? false),
    is_flag: options.isFlag ?? false,
    multiple: options.multiple ?? false,
    nargs: options.nargs ?? 1,
    default: options.default,
    help: options.help,
    type: options.type,
    choices: options.choices,
    conflicts_with: options.conflictsWith,
    sensitive: options.sensitive ?? false
  };
}
function createJsonInputParameters(options) {
  const bodyLabel = options?.bodyLabel ?? "JSON object body";
  const parameters = [
    createOptionParameter({
      name: "--data",
      type: "TEXT",
      help: `Inline ${bodyLabel.toLowerCase()}`,
      conflictsWith: ["--file", "--stdin-json"]
    }),
    createOptionParameter({
      name: "--file",
      type: "TEXT",
      help: `Path to a JSON file containing the ${bodyLabel.toLowerCase()}`,
      conflictsWith: ["--data", "--stdin-json"]
    })
  ];
  if (options?.includeStdinJson ?? true) {
    parameters.push(
      createOptionParameter({
        name: "--stdin-json",
        type: "BOOLEAN",
        help: `Read the ${bodyLabel.toLowerCase()} from stdin`,
        isFlag: true,
        conflictsWith: ["--data", "--file"]
      })
    );
  }
  return parameters;
}
function createObjectInputSchema(options) {
  return {
    type: "object",
    description: options?.description ?? "JSON object body",
    properties: options?.properties ?? {},
    required: options?.required ?? [],
    additionalProperties: options?.additionalProperties ?? true,
    examples: options?.examples ?? []
  };
}

// src/core/output.ts
var SCHEMA_VERSION = "pocketbase-cli/v2";
var CliExitError = class extends Error {
  constructor(code, message) {
    super(message ?? `Command failed with exit code ${code}`);
    this.code = code;
  }
};
function stringifyData(data) {
  if (data === void 0 || data === null) {
    return "";
  }
  if (typeof data === "string") {
    return data;
  }
  return JSON.stringify(data, null, 2);
}
function extractHttpPayload(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data;
  const method = record.method;
  const url = record.url;
  const status = record.status;
  if (typeof method === "string" && typeof url === "string" && typeof status === "number") {
    return { method, url, status };
  }
  return null;
}
function extractResultPayload(data) {
  if (!data || typeof data !== "object") {
    return data;
  }
  const record = data;
  const keys = ["method", "url", "status", "data"];
  if (keys.every((key) => Object.prototype.hasOwnProperty.call(record, key))) {
    return record.data;
  }
  return data;
}
function extractPaginationPayload(result) {
  if (!result || typeof result !== "object") {
    return null;
  }
  const payload = result;
  const items = payload.items;
  if (!Array.isArray(items)) {
    return null;
  }
  const page = typeof payload.page === "number" ? payload.page : null;
  const perPage = typeof payload.perPage === "number" ? payload.perPage : null;
  const totalItems = typeof payload.totalItems === "number" ? payload.totalItems : null;
  const totalPages = typeof payload.totalPages === "number" ? payload.totalPages : null;
  const fetchedAll = typeof payload.fetchedAll === "boolean" ? payload.fetchedAll : false;
  const fetchedPages = typeof payload.fetchedPages === "number" ? payload.fetchedPages : null;
  const nextPage = typeof payload.nextPage === "number" ? payload.nextPage : null;
  const hasMore = nextPage !== null || (page !== null && totalPages !== null ? page < totalPages : false);
  return {
    page,
    per_page: perPage,
    total_items: totalItems,
    total_pages: totalPages,
    item_count: items.length,
    has_more: hasMore,
    next_page: nextPage,
    fetched_all: fetchedAll,
    fetched_pages: fetchedPages
  };
}
function inferErrorType(options) {
  const lowered = options.message.toLowerCase();
  if (options.missingPrerequisite) {
    return "missing_prerequisite";
  }
  if (lowered.startsWith("usage:")) {
    return "usage_error";
  }
  if (lowered.includes("destructive") || lowered.includes("--yes")) {
    return "confirmation_required";
  }
  if (lowered.includes("invalid json") || lowered.includes("must include") || lowered.includes("expects ") || lowered.includes("requires exactly one")) {
    return "invalid_input";
  }
  if (options.httpStatus === 401) {
    return "unauthorized";
  }
  if (options.httpStatus === 403) {
    return "forbidden";
  }
  if (options.httpStatus === 404) {
    return "not_found";
  }
  if (options.httpStatus !== null && options.httpStatus >= 500) {
    return "remote_http_error";
  }
  if (options.code >= 500) {
    return "remote_http_error";
  }
  return "runtime_error";
}
function inferRetryable(code, httpStatus) {
  if (httpStatus !== null) {
    return httpStatus === 408 || httpStatus === 429 || httpStatus >= 500;
  }
  return code >= 500;
}
function buildMeta(action, code) {
  return code === void 0 ? {
    schema_version: SCHEMA_VERSION,
    command: action
  } : {
    schema_version: SCHEMA_VERSION,
    command: action,
    exit_code: code
  };
}
function writeLine(target, value) {
  target.write(`${value}
`);
}
function buildSuccessEnvelope(options) {
  const http = extractHttpPayload(options.data);
  const resultPayload = extractResultPayload(options.data);
  const pagination = extractPaginationPayload(resultPayload);
  const payload = {
    ok: true,
    schema_version: SCHEMA_VERSION,
    command: options.action,
    action: options.action,
    message: options.message,
    meta: buildMeta(options.action)
  };
  if (options.data !== void 0) {
    payload.data = options.data;
    payload.result = resultPayload;
  }
  if (http) {
    payload.http = http;
  }
  if (pagination) {
    payload.pagination = pagination;
  }
  return payload;
}
function emitSuccess(options) {
  const payload = buildSuccessEnvelope({
    action: options.action,
    message: options.message,
    data: options.data
  });
  const stdout = options.stdout ?? process.stdout;
  if (options.jsonOutput) {
    writeLine(stdout, JSON.stringify(payload));
    return payload;
  }
  writeLine(stdout, options.message);
  const rendered = stringifyData(options.data);
  if (rendered) {
    writeLine(stdout, rendered);
  }
  return payload;
}
function buildErrorEnvelope(options) {
  const code = options.code ?? 1;
  const http = extractHttpPayload(options.data);
  const resolvedHttpStatus = options.httpStatus ?? (http ? http.status : null);
  const payload = {
    ok: false,
    schema_version: SCHEMA_VERSION,
    command: options.action,
    action: options.action,
    message: options.message,
    code,
    meta: buildMeta(options.action, code),
    error: {
      type: options.errorType ?? inferErrorType({
        code,
        message: options.message,
        httpStatus: resolvedHttpStatus,
        missingPrerequisite: options.missingPrerequisite ?? null
      }),
      retryable: options.retryable ?? inferRetryable(code, resolvedHttpStatus),
      message: options.message,
      hint: options.hint ?? null,
      missing_prerequisite: options.missingPrerequisite ?? null,
      http_status: resolvedHttpStatus
    }
  };
  if (options.data !== void 0) {
    payload.data = options.data;
  }
  if (http) {
    payload.http = http;
  }
  return payload;
}
function emitError(options) {
  const payload = buildErrorEnvelope(options);
  const stderr = options.stderr ?? process.stderr;
  if (options.jsonOutput) {
    writeLine(stderr, JSON.stringify(payload));
  } else {
    writeLine(stderr, options.message);
    const rendered = stringifyData(options.data);
    if (rendered) {
      writeLine(stderr, rendered);
    }
  }
  throw new CliExitError(options.code ?? 1, options.message);
}

// src/commands/auth-support.ts
function extractAuthPayload(result, action) {
  const payload = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
  const token = payload.token;
  const record = payload.record;
  if (typeof token !== "string" || !token.trim()) {
    throw new Error(`${action} response did not include a usable token`);
  }
  if (record !== void 0 && (record === null || typeof record !== "object" || Array.isArray(record))) {
    throw new Error(`${action} response contained an invalid record payload`);
  }
  return {
    token,
    record: record ?? {}
  };
}
async function saveRemoteAuthResult(context, options) {
  let payload;
  try {
    payload = extractAuthPayload(options.result, options.action);
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action: options.action.replace(/ /gu, "."),
      message: error instanceof Error ? error.message : String(error),
      data: redactAuthResult(options.result)
    });
  }
  context.state.setRemoteAuth({
    baseUrl: options.baseUrl,
    token: payload.token,
    record: payload.record,
    collection: options.collection
  });
  await saveContextState(context);
}
function redactAuthResult(result) {
  return sanitizeRemoteResult(result);
}

// src/commands/auth-browser.ts
var import_node_crypto3 = require("crypto");
var childProcess = __toESM(require("child_process"));
var import_node_http = require("http");

// src/commands/preflight.ts
var SUPERUSER_IP_WHITELIST_HINT = "PocketBase v0.38+ may reject an otherwise valid superuser token when the request IP is not allowed by the superuser IP whitelist. Check the server whitelist or run the CLI from an allowed IP.";
function createCheck(options) {
  return {
    name: options.name,
    status: options.status,
    required: options.required,
    message: options.message,
    hint: options.hint ?? null,
    data: options.data ?? null
  };
}
async function probeHealth(context, baseUrl) {
  const client = new PocketBaseRemoteClient({
    baseUrl,
    collection: resolveAuthCollection(context),
    timeout: context.state.config.timeout ?? null
  });
  try {
    const result = await client.raw({
      method: "GET",
      path: "/api/health",
      requireAuth: false
    });
    return {
      status: "pass",
      message: "Health endpoint responded successfully.",
      data: {
        method: result.method,
        url: result.url,
        status: result.status,
        result: result.data
      }
    };
  } catch (error) {
    if (error instanceof PocketBaseRemoteError) {
      return {
        status: "fail",
        message: error.message,
        data: error.toJSON()
      };
    }
    throw error;
  }
}
async function probeAuthenticatedAccess(context, baseUrl, collection) {
  const client = new PocketBaseRemoteClient({
    baseUrl,
    token: context.state.remoteAuth.token ?? null,
    collection,
    timeout: context.state.config.timeout ?? null
  });
  try {
    const result = await client.refresh();
    return {
      status: "pass",
      message: "Authenticated auth-refresh probe responded successfully.",
      data: {
        method: result.method,
        url: result.url,
        status: result.status
      }
    };
  } catch (error) {
    if (error instanceof PocketBaseRemoteError) {
      return {
        status: "fail",
        message: error.message,
        hint: error.status === 403 ? SUPERUSER_IP_WHITELIST_HINT : null,
        data: error.toJSON()
      };
    }
    throw error;
  }
}
async function runPreflightCheck(context, options) {
  const rawResolvedBaseUrl = resolveBaseUrl(context, options.baseUrl);
  let resolvedBaseUrl = null;
  let baseUrlValidationError = null;
  if (rawResolvedBaseUrl) {
    try {
      resolvedBaseUrl = parseBaseUrlValue(
        options.baseUrl !== void 0 ? "--base-url" : "base_url",
        rawResolvedBaseUrl
      );
    } catch (error) {
      baseUrlValidationError = error instanceof Error ? error.message : String(error);
    }
  }
  const resolvedCollection = resolveAuthCollection(context, options.collection);
  const savedAuthBaseUrl = normalizeBaseUrl(context.state.remoteAuth.base_url ?? null);
  const savedAuthCollection = String(context.state.remoteAuth.collection ?? "_superusers");
  const savedAuthPresent = context.state.hasRemoteAuth();
  const authMatchesTarget = savedAuthPresent && Boolean(resolvedBaseUrl) && savedAuthBaseUrl === resolvedBaseUrl && savedAuthCollection === resolvedCollection;
  const checks = [];
  const missingPrerequisites = [];
  const recommendations = [];
  let authProbe = null;
  if (resolvedBaseUrl) {
    checks.push(
      createCheck({
        name: "base_url",
        status: "pass",
        required: true,
        message: "Base URL is configured.",
        data: { resolved_base_url: resolvedBaseUrl }
      })
    );
  } else {
    missingPrerequisites.push("base_url");
    recommendations.push(
      "Run `config set base_url <url>` or pass `--base-url <url>`."
    );
    checks.push(
      createCheck({
        name: "base_url",
        status: "fail",
        required: true,
        message: baseUrlValidationError ?? "Base URL is missing.",
        hint: baseUrlValidationError ? "Use https:// for remote PocketBase URLs, or http:// only for localhost/127.0.0.1/[::1]." : "Run `config set base_url <url>` or pass `--base-url <url>`.",
        data: { resolved_base_url: rawResolvedBaseUrl ?? null }
      })
    );
  }
  if (options.requireAuth) {
    if (authMatchesTarget && resolvedBaseUrl) {
      checks.push(
        createCheck({
          name: "auth",
          status: "pass",
          required: true,
          message: "Saved auth matches the resolved target.",
          data: {
            base_url: savedAuthBaseUrl,
            collection: savedAuthCollection
          }
        })
      );
      authProbe = await probeAuthenticatedAccess(context, resolvedBaseUrl, resolvedCollection);
      const authProbeHint = typeof authProbe.hint === "string" && authProbe.hint ? authProbe.hint : void 0;
      if (authProbeHint) {
        recommendations.push(authProbeHint);
      }
      checks.push(
        createCheck({
          name: "auth_probe",
          status: authProbe.status,
          required: true,
          message: String(authProbe.message),
          hint: authProbeHint,
          data: authProbe.data
        })
      );
    } else {
      missingPrerequisites.push("auth_login");
      recommendations.push(
        "Run `auth login` again so the saved auth token matches the resolved base URL and collection."
      );
      checks.push(
        createCheck({
          name: "auth",
          status: "fail",
          required: true,
          message: savedAuthPresent ? "Saved auth does not match the resolved target." : "Saved auth token is missing.",
          hint: "Run `auth login` again after setting the intended `base_url` and `auth_collection`.",
          data: {
            saved_auth_present: savedAuthPresent,
            saved_auth_base_url: savedAuthBaseUrl,
            saved_auth_collection: savedAuthCollection
          }
        })
      );
    }
  } else {
    checks.push(
      createCheck({
        name: "auth",
        status: authMatchesTarget ? "pass" : "skip",
        required: false,
        message: savedAuthPresent ? authMatchesTarget ? "Saved auth is available for the resolved target." : "Saved auth exists but targets a different base URL or collection." : "Saved auth is optional for this preflight run.",
        data: {
          saved_auth_present: savedAuthPresent,
          saved_auth_matches_target: authMatchesTarget
        }
      })
    );
  }
  let health = null;
  if (options.skipHealth || !resolvedBaseUrl) {
    health = {
      status: options.skipHealth ? "skip" : "fail",
      message: options.skipHealth ? "Health probe skipped." : "Health probe skipped because base URL is missing.",
      data: null
    };
    checks.push(
      createCheck({
        name: "health",
        status: options.skipHealth ? "skip" : "fail",
        required: !options.skipHealth && Boolean(resolvedBaseUrl),
        message: health.message
      })
    );
  } else {
    health = await probeHealth(context, resolvedBaseUrl);
    checks.push(
      createCheck({
        name: "health",
        status: health.status,
        required: true,
        message: String(health.message),
        data: health.data
      })
    );
  }
  const ready = checks.every((check) => {
    const status = check.status;
    return check.required !== true || status === "pass";
  });
  return {
    ready,
    require_auth: Boolean(options.requireAuth),
    skipped_health: Boolean(options.skipHealth),
    resolved_base_url: resolvedBaseUrl,
    resolved_auth_collection: resolvedCollection,
    missing_prerequisites: missingPrerequisites,
    recommendations,
    saved_auth: {
      present: savedAuthPresent,
      target_match: authMatchesTarget,
      base_url: savedAuthBaseUrl,
      collection: savedAuthCollection
    },
    auth_probe: authProbe,
    checks,
    health
  };
}
function createPreflightDefinition(context) {
  return {
    name: "preflight",
    path: "preflight",
    kind: "command",
    summary: "Check whether the current CLI state is ready for the next remote command",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json preflight",
      "pocketbase-cli --json preflight --require-auth",
      "pocketbase-cli --json preflight --base-url https://pb.example.com --collection users --skip-health"
    ],
    notes: [
      "This command is read-only and never mutates saved config or auth state.",
      "Use `--require-auth` when the next command needs a saved auth token matched to the resolved target."
    ],
    parameters: [
      createOptionParameter({
        name: "--base-url",
        type: "TEXT",
        help: "Override the resolved PocketBase base URL for this preflight check"
      }),
      createOptionParameter({
        name: "--collection",
        type: "TEXT",
        help: "Override the resolved auth collection for this preflight check"
      }),
      createOptionParameter({
        name: "--require-auth",
        type: "BOOLEAN",
        help: "Mark saved auth as a required prerequisite",
        isFlag: true
      }),
      createOptionParameter({
        name: "--skip-health",
        type: "BOOLEAN",
        help: "Skip the `/api/health` probe and only validate local prerequisites",
        isFlag: true
      })
    ],
    build: () => new Command("preflight").description("Check whether the current CLI state is ready for the next remote command").option("--base-url <url>", "Override the resolved PocketBase base URL for this check").option("--collection <name>", "Override the resolved auth collection for this check").option("--require-auth", "Require a saved auth token matched to the resolved target").option("--skip-health", "Skip probing `/api/health`").action(async (options) => {
      const historyParts = ["preflight"];
      if (options.baseUrl) {
        historyParts.push("--base-url", options.baseUrl);
      }
      if (options.collection) {
        historyParts.push("--collection", options.collection);
      }
      if (options.requireAuth) {
        historyParts.push("--require-auth");
      }
      if (options.skipHealth) {
        historyParts.push("--skip-health");
      }
      await recordCommand(context, historyParts.join(" "));
      const payload = await runPreflightCheck(context, options);
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "preflight",
        message: payload.ready ? "Preflight check passed" : "Preflight check requires attention",
        data: payload
      });
    })
  };
}

// src/commands/auth-browser.ts
var POCKETBASE_LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="25.536" y="13.4861" width="1.71467" height="16.7338" transform="rotate(45.9772 25.536 13.4861)" fill="white"/>
<path d="M26 14H36.8C37.4628 14 38 14.5373 38 15.2V36.8C38 37.4628 37.4628 38 36.8 38H15.2C14.5373 38 14 37.4628 14 36.8V26" fill="white"/>
<path d="M26 14H36.8C37.4628 14 38 14.5373 38 15.2V36.8C38 37.4628 37.4628 38 36.8 38H15.2C14.5373 38 14 37.4628 14 36.8V26" stroke="#16161a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M26 14V3.2C26 2.53726 25.4628 2 24.8 2H3.2C2.53726 2 2 2.53726 2 3.2V24.8C2 25.4628 2.53726 26 3.2 26H14" fill="white"/>
<path d="M26 14V3.2C26 2.53726 25.4628 2 24.8 2H3.2C2.53726 2 2 2.53726 2 3.2V24.8C2 25.4628 2.53726 26 3.2 26H14" stroke="#16161a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 20C9.44772 20 9 19.5523 9 19V8C9 7.44772 9.44772 7 10 7H13.7531C14.4801 7 15.1591 7.07311 15.7901 7.21932C16.4348 7.35225 16.9904 7.58487 17.4568 7.91718C17.9369 8.2362 18.3141 8.6682 18.5885 9.21319C18.8628 9.74489 19 10.4029 19 11.1871C19 11.9448 18.856 12.6028 18.5679 13.161C18.2936 13.7193 17.9163 14.1779 17.4362 14.5368C16.9561 14.8957 16.4005 15.1616 15.7695 15.3344C15.1385 15.5072 14.4664 15.5936 13.7531 15.5936H13.0247C12.4724 15.5936 12.0247 16.0413 12.0247 16.5936V19C12.0247 19.5523 11.577 20 11.0247 20H10ZM12.0247 12.2607C12.0247 12.813 12.4724 13.2607 13.0247 13.2607H13.5679C15.214 13.2607 16.037 12.5695 16.037 11.1871C16.037 10.5092 15.8244 10.0307 15.3992 9.75153C14.9877 9.47239 14.3772 9.33282 13.5679 9.33282H13.0247C12.4724 9.33282 12.0247 9.78054 12.0247 10.3328V12.2607Z" fill="#16161a"/>
<path d="M22 33C21.4477 33 21 32.5523 21 32V21C21 20.4477 21.4477 20 22 20H25.4877C26.1844 20 26.8265 20.0532 27.4139 20.1595C28.015 20.2526 28.5342 20.4254 28.9713 20.6779C29.4085 20.9305 29.75 21.2628 29.9959 21.6748C30.2555 22.0869 30.3852 22.6053 30.3852 23.2301C30.3852 23.5225 30.3374 23.8149 30.2418 24.1074C30.1598 24.3998 30.0232 24.6723 29.832 24.9248C29.6407 25.1774 29.4016 25.4034 29.1148 25.6028C28.837 25.7958 28.5081 25.939 28.1279 26.0323C28.1058 26.0378 28.0902 26.0575 28.0902 26.0802V26.0802C28.0902 26.1039 28.1073 26.1242 28.1306 26.1286C29.0669 26.3034 29.7774 26.6332 30.2623 27.1181C30.7541 27.6099 31 28.2945 31 29.1718C31 29.8364 30.8702 30.408 30.6107 30.8865C30.3511 31.365 29.9891 31.7638 29.5246 32.0828C29.0601 32.3885 28.5137 32.6212 27.8852 32.7807C27.2705 32.9269 26.6011 33 25.8771 33H22ZM24.0123 24.2239C24.0123 24.7762 24.46 25.2239 25.0123 25.2239H25.3443C26.082 25.2239 26.6148 25.0844 26.9426 24.8052C27.2705 24.5261 27.4344 24.1339 27.4344 23.6288C27.4344 23.1503 27.2637 22.8113 26.9221 22.612C26.5943 22.3993 26.0751 22.2929 25.3648 22.2929H25.0123C24.46 22.2929 24.0123 22.7407 24.0123 23.2929V24.2239ZM24.0123 29.7071C24.0123 30.2593 24.46 30.7071 25.0123 30.7071H25.6311C27.2432 30.7071 28.0492 30.1222 28.0492 28.9525C28.0492 28.3809 27.8511 27.9688 27.4549 27.7163C27.0724 27.4637 26.4645 27.3374 25.6311 27.3374H25.0123C24.46 27.3374 24.0123 27.7851 24.0123 28.3374V29.7071Z" fill="#16161a"/>
</svg>`;
var AUTH_METHODS_PROBE_TIMEOUT_SECONDS = 3;
function escapeHtml(value) {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
}
function titleCaseWords(value) {
  return value.split(/\s+/u).filter(Boolean).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}
function formatIdentityLabel(identityFields) {
  if (identityFields.length === 0) {
    return "Identity";
  }
  const words = identityFields.map((field) => titleCaseWords(field.replace(/[_-]+/gu, " ")));
  if (words.length === 1) {
    return words[0];
  }
  return `${words.slice(0, -1).join(" or ")} or ${words.at(-1)}`;
}
function createDefaultAuthMethods() {
  return {
    password: {
      identityFields: ["identity"],
      enabled: true
    },
    mfa: {
      enabled: false
    },
    otp: {
      enabled: false
    }
  };
}
function buildLoginPageView(authMethods) {
  const identityFields = authMethods.password?.identityFields?.length ? authMethods.password.identityFields : ["email"];
  const hasExtraSteps = Boolean(authMethods.mfa?.enabled || authMethods.otp?.enabled);
  return {
    identityLabel: formatIdentityLabel(identityFields),
    identityType: identityFields.length === 1 && identityFields[0] === "email" ? "email" : "text",
    submitLabel: hasExtraSteps ? "Next" : "Login"
  };
}
function renderLoginPage(options) {
  const identity = options.identity ? escapeHtml(options.identity) : "";
  const baseUrl = options.baseUrl ? escapeHtml(options.baseUrl) : "";
  const error = options.error ? `<div class="help-block help-block-error"><pre>${escapeHtml(options.error)}</pre></div>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PocketBase CLI Login</title>
  <style>
    :root {
      color-scheme: light;
      --baseFontFamily: "Source Sans 3", "Segoe UI", sans-serif, emoji;
      --txtPrimaryColor: #1a1a24;
      --txtHintColor: #617079;
      --txtDisabledColor: #a0a6ac;
      --primaryColor: #1a1a24;
      --baseColor: #ffffff;
      --baseAlt1Color: #e3e8ed;
      --baseAlt2Color: #d7dde3;
      --dangerColor: #e34562;
      --baseFontSize: 14.5px;
      --smFontSize: 13px;
      --lgFontSize: 15px;
      --baseLineHeight: 22px;
      --smLineHeight: 16px;
      --inputHeight: 54px;
      --lgBtnHeight: 54px;
      --baseSpacing: 30px;
      --smSpacing: 20px;
      --lgSpacing: 50px;
      --smWrapperWidth: 420px;
      --baseAnimationSpeed: 150ms;
      --activeAnimationSpeed: 70ms;
      --baseRadius: 4px;
      --btnRadius: 4px;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--baseFontFamily);
      font-size: var(--baseFontSize);
      line-height: var(--baseLineHeight);
      color: var(--txtPrimaryColor);
      background: var(--baseColor);
    }
    .page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px 16px 60px;
    }
    .wrapper {
      width: min(100%, var(--smWrapperWidth));
      animation: slide-in 200ms ease-out;
    }
    .branding {
      text-align: center;
      margin-bottom: var(--lgSpacing);
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: var(--txtPrimaryColor);
      line-height: 1;
    }
    .logo svg {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }
    .logo-text {
      font-size: 28px;
      letter-spacing: -0.03em;
    }
    .logo strong {
      font-weight: 600;
    }
    .content {
      width: 100%;
      margin-bottom: var(--baseSpacing);
      text-align: center;
    }
    .content h4 {
      margin: 0;
      font-size: 18px;
      line-height: 24px;
      font-weight: 400;
      color: var(--txtPrimaryColor);
    }
    .help-block {
      position: relative;
      margin: 0 0 var(--smSpacing);
      font-size: var(--smFontSize);
      line-height: var(--smLineHeight);
      color: var(--dangerColor);
      word-break: break-word;
    }
    .block {
      display: block;
      width: 100%;
    }
    .form-field {
      position: relative;
      width: 100%;
      margin-bottom: var(--smSpacing);
    }
    .form-field label {
      position: absolute;
      top: 10px;
      left: 15px;
      z-index: 1;
      margin: 0;
      font-size: 12px;
      line-height: 16px;
      font-weight: 600;
      color: var(--txtHintColor);
      pointer-events: none;
    }
    .form-field.required > label::after {
      content: "*";
      margin-left: 2px;
      color: var(--dangerColor);
    }
    .form-field.base-url-field {
      margin-bottom: var(--baseSpacing);
    }
    input {
      display: block;
      width: 100%;
      outline: 0;
      border: 0;
      margin: 0;
      padding: 22px 15px 8px;
      line-height: 20px;
      min-height: var(--inputHeight);
      background: var(--baseAlt1Color);
      color: var(--txtPrimaryColor);
      font-size: var(--lgFontSize);
      font-family: var(--baseFontFamily);
      border-radius: var(--baseRadius);
      appearance: none;
      transition: background var(--baseAnimationSpeed), box-shadow var(--baseAnimationSpeed);
    }
    input::placeholder {
      color: var(--txtDisabledColor);
    }
    input:hover {
      background: var(--baseAlt2Color);
    }
    input:focus {
      outline: none;
      background: var(--baseAlt2Color);
      box-shadow: 0 0 0 2px rgba(26, 26, 36, 0.08);
    }
    .help-block pre {
      margin: 0;
      white-space: pre-wrap;
      font: inherit;
    }
    .btn {
      position: relative;
      z-index: 1;
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
      column-gap: 10px;
      min-height: var(--lgBtnHeight);
      border: 0;
      margin: 10px 0 0;
      padding: 5px 30px;
      border-radius: var(--btnRadius);
      background: none;
      color: #fff;
      font-size: var(--lgFontSize);
      font-family: var(--baseFontFamily);
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      transition: color var(--baseAnimationSpeed);
    }
    .btn::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: inherit;
      background: var(--primaryColor);
      transition: opacity var(--baseAnimationSpeed), transform var(--baseAnimationSpeed);
    }
    .btn:hover::before,
    .btn:focus-visible::before {
      opacity: 0.9;
    }
    .btn:active::before {
      opacity: 0.8;
      transition-duration: var(--activeAnimationSpeed);
    }
    .btn .icon {
      display: inline-block;
      font-size: 1.2em;
      line-height: 1;
      transition: transform var(--baseAnimationSpeed);
    }
    .btn:hover .icon,
    .btn:focus-visible .icon {
      transform: translateX(3px);
    }
    .btn.is-loading {
      cursor: default;
      pointer-events: none;
    }
    .btn.is-loading .txt,
    .btn.is-loading .icon {
      opacity: 0;
    }
    .btn.is-loading::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      margin-top: -9px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
    }
    .help-block-error {
      color: var(--dangerColor);
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="wrapper">
      <div class="branding">
        <figure class="logo">${POCKETBASE_LOGO_SVG}<span class="logo-text">Pocket<strong>Base</strong></span></figure>
      </div>
      <section>
        <div class="content">
          <h4>Superuser login</h4>
        </div>
        ${error}
        <form class="block" method="post" id="login-form">
        <input type="hidden" name="state" value="${escapeHtml(options.state)}">
        <div class="form-field required base-url-field">
          <label for="baseUrl">BaseUrl</label>
          <input id="baseUrl" name="baseUrl" type="url" inputmode="url" placeholder="https://pb.example.com" autocapitalize="none" spellcheck="false" autocomplete="url" value="${baseUrl}" required>
        </div>
        <div class="form-field required">
          <label for="identity">${escapeHtml(options.identityLabel)}</label>
          <input id="identity" name="identity" type="${options.identityType}" autocomplete="username" autocapitalize="none" spellcheck="false" value="${identity}" required autofocus>
        </div>
        <div class="form-field required">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
        </div>
          <button class="btn btn-lg btn-block btn-next" type="submit" id="login-submit"><span class="txt">${escapeHtml(options.submitLabel)}</span><span class="icon" aria-hidden="true">\u2192</span></button>
        </form>
      </section>
    </div>
  </main>
  <script>
    const form = document.getElementById("login-form");
    const submitButton = document.getElementById("login-submit");
    if (form instanceof HTMLFormElement && submitButton instanceof HTMLButtonElement) {
      form.addEventListener("submit", () => {
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
        submitButton.setAttribute("aria-busy", "true");
      });
    }
  </script>
</body>
</html>`;
}
function renderSuccessPage(baseUrl, collection) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login complete</title>
  <style>
    :root {
      color-scheme: light;
      --baseFontFamily: "Source Sans 3", "Segoe UI", sans-serif, emoji;
      --txtPrimaryColor: #1a1a24;
      --txtHintColor: #617079;
      --baseColor: #ffffff;
      --baseAlt1Color: #e3e8ed;
      --baseFontSize: 14.5px;
      --baseLineHeight: 22px;
      --lgSpacing: 50px;
      --smWrapperWidth: 420px;
      --baseRadius: 4px;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px 60px;
      font-family: var(--baseFontFamily);
      font-size: var(--baseFontSize);
      line-height: var(--baseLineHeight);
      background: var(--baseColor);
      color: var(--txtPrimaryColor);
    }
    .wrapper {
      width: min(100%, var(--smWrapperWidth));
      text-align: center;
    }
    .branding {
      margin-bottom: var(--lgSpacing);
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      line-height: 1;
    }
    .logo svg {
      width: 40px;
      height: 40px;
    }
    .logo-text {
      font-size: 29px;
      letter-spacing: -0.03em;
    }
    .logo strong {
      font-weight: 600;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 18px;
      line-height: 24px;
      font-weight: 400;
    }
    p {
      margin: 8px 0 0;
      color: var(--txtHintColor);
    }
    .summary {
      padding: 12px 14px;
      margin-top: 20px;
      border-radius: var(--baseRadius);
      background: var(--baseAlt1Color);
      color: var(--txtPrimaryColor);
    }
  </style>
</head>
<body>
  <main class="wrapper">
    <div class="branding">
      <figure class="logo">${POCKETBASE_LOGO_SVG}<span class="logo-text">Pocket<strong>Base</strong></span></figure>
    </div>
    <h1>Login complete</h1>
    <p>You can close this tab and return to the CLI.</p>
    <p class="summary">Saved auth token for ${escapeHtml(baseUrl)} using ${escapeHtml(collection)}.</p>
  </main>
</body>
</html>`;
}
function writeHtml(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(body);
}
async function readFormBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 64 * 1024) {
      throw new Error("Browser login form payload exceeded 64 KB.");
    }
    chunks.push(buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
async function probeAuthMethods(options) {
  const client = new PocketBaseRemoteClient({
    baseUrl: options.baseUrl,
    collection: options.collection,
    timeout: Math.min(options.timeoutSeconds, AUTH_METHODS_PROBE_TIMEOUT_SECONDS)
  });
  try {
    const authMethodsResult = await client.recordAuthMethods(options.collection);
    return authMethodsResult.data;
  } catch {
    return null;
  }
}
async function tryOpenBrowser(url) {
  const command = process.platform === "darwin" ? { bin: "open", args: [url] } : process.platform === "win32" ? { bin: "cmd", args: ["/c", "start", "", url] } : { bin: "xdg-open", args: [url] };
  try {
    const child = childProcess.spawn(command.bin, command.args, {
      detached: true,
      stdio: "ignore"
    });
    const opened = await new Promise((resolve) => {
      const handleError = () => {
        child.off("error", handleError);
        resolve(false);
      };
      child.once("error", handleError);
      setImmediate(() => {
        child.off("error", handleError);
        resolve(true);
      });
    });
    child.unref();
    return opened;
  } catch {
    return false;
  }
}
function parseTimeoutSeconds(context, action, value) {
  if (value === void 0) {
    return 300;
  }
  try {
    return parseIntegerOptionValue("--timeout", value, { min: 1 });
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input"
    });
  }
}
function writeLaunchMessage(options) {
  const prefix = options.autoOpened ? "Opened browser for login. If nothing appeared, use this URL:" : "Open this URL in your browser to continue login:";
  process.stderr.write(`${prefix}
${options.url}
`);
  process.stderr.write(`Waiting up to ${options.timeoutSeconds}s for browser login to complete.
`);
}
function createAuthLoginDefinition(context) {
  return {
    name: "login",
    path: "auth.login",
    kind: "command",
    summary: "Open a local browser login page and save the resulting remote auth token",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli auth login", "pocketbase-cli auth login --no-open"],
    notes: [
      "This command starts a temporary HTTP server bound to 127.0.0.1 and never exposes credentials over a remote callback URL."
    ],
    parameters: [
      createOptionParameter({
        name: "--base-url",
        type: "TEXT",
        help: "Prefill the BaseUrl field, for example `https://pb.example.com`"
      }),
      createOptionParameter({
        name: "--collection",
        type: "TEXT",
        help: "Auth collection name, defaults to `config auth_collection` or `_superusers`"
      }),
      createOptionParameter({
        name: "--identity",
        type: "TEXT",
        help: "Prefill the browser form identity field"
      }),
      createOptionParameter({
        name: "--timeout",
        type: "INTEGER",
        help: "How many seconds to wait for the browser login to complete",
        default: 300
      }),
      createOptionParameter({
        name: "--no-open",
        type: "BOOLEAN",
        help: "Start the local login page but do not try to auto-open a browser",
        isFlag: true
      })
    ],
    build: () => new Command("login").description("Open a local browser login page and save the resulting remote auth token").option("--base-url <url>", "Prefill the BaseUrl field, for example https://pb.example.com").option(
      "--collection <name>",
      "Auth collection to use, defaults to config auth_collection or _superusers"
    ).option("--identity <value>", "Prefill the browser form identity field").option("--timeout <seconds>", "How many seconds to wait for browser login", "300").option("--no-open", "Do not auto-open the browser").action(async (options) => {
      const action = "auth.login";
      let initialBaseUrl = resolveBaseUrl(context) ?? "";
      if (options.baseUrl) {
        try {
          initialBaseUrl = parseBaseUrlValue("--base-url", options.baseUrl);
        } catch (error) {
          emitError({
            jsonOutput: context.jsonMode,
            action,
            message: error instanceof Error ? error.message : String(error),
            errorType: "invalid_input",
            hint: "Use https:// for remote PocketBase URLs, or http:// only for localhost/127.0.0.1/[::1]."
          });
        }
      }
      const collection = options.collection ?? resolveAuthCollection(context);
      const identity = options.identity?.trim() || "";
      const timeoutSeconds = parseTimeoutSeconds(context, action, options.timeout);
      const timeoutMs = timeoutSeconds * 1e3;
      const sessionState = (0, import_node_crypto3.randomBytes)(24).toString("hex");
      const routePath = `/login/${(0, import_node_crypto3.randomBytes)(12).toString("hex")}`;
      let loginPageView = buildLoginPageView(createDefaultAuthMethods());
      const historyParts = ["auth", "login"];
      if (options.baseUrl) {
        historyParts.push("--base-url", options.baseUrl);
      }
      if (options.collection) {
        historyParts.push("--collection", options.collection);
      }
      if (options.identity) {
        historyParts.push("--identity", options.identity);
      }
      if (options.open === false) {
        historyParts.push("--no-open");
      }
      if (options.timeout && options.timeout !== "300") {
        historyParts.push("--timeout", options.timeout);
      }
      await recordCommand(context, historyParts.join(" "));
      let settled = false;
      let launchUrl = "";
      let timeoutHandle = null;
      let finalizeLogin = null;
      const renderCurrentLoginPage = (pageOptions) => renderLoginPage({
        ...pageOptions,
        ...loginPageView
      });
      const server = (0, import_node_http.createServer)(async (request, response) => {
        if (settled) {
          writeHtml(response, 410, "<p>This browser login session is already complete.</p>");
          return;
        }
        const requestPath = request.url ? new URL(request.url, "http://127.0.0.1").pathname : "/";
        if (requestPath !== routePath) {
          writeHtml(response, 404, "<p>Not found.</p>");
          return;
        }
        if (request.method === "GET") {
          writeHtml(
            response,
            200,
            renderCurrentLoginPage({
              baseUrl: initialBaseUrl,
              collection,
              state: sessionState,
              identity
            })
          );
          return;
        }
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET, POST");
          response.end("Method Not Allowed");
          return;
        }
        let form;
        try {
          form = await readFormBody(request);
        } catch (error) {
          writeHtml(
            response,
            413,
            renderCurrentLoginPage({
              baseUrl: initialBaseUrl,
              collection,
              state: sessionState,
              identity,
              error: error instanceof Error ? error.message : String(error)
            })
          );
          return;
        }
        const postedState = form.get("state") ?? "";
        const postedBaseUrlRaw = form.get("baseUrl")?.trim() ?? "";
        const postedBaseUrl = postedBaseUrlRaw ? normalizeBaseUrl(postedBaseUrlRaw) : null;
        const postedIdentity = form.get("identity")?.trim() ?? "";
        const postedPassword = form.get("password") ?? "";
        if (postedState !== sessionState) {
          writeHtml(
            response,
            400,
            renderCurrentLoginPage({
              baseUrl: postedBaseUrl ?? initialBaseUrl,
              collection,
              state: sessionState,
              identity: postedIdentity || identity,
              error: "This browser login session is invalid or expired."
            })
          );
          return;
        }
        if (!postedBaseUrl) {
          writeHtml(
            response,
            400,
            renderCurrentLoginPage({
              baseUrl: initialBaseUrl,
              collection,
              state: sessionState,
              identity: postedIdentity || identity,
              error: "BaseUrl is required."
            })
          );
          return;
        }
        let validatedPostedBaseUrl;
        try {
          validatedPostedBaseUrl = parseBaseUrlValue("BaseUrl", postedBaseUrl);
        } catch (error) {
          writeHtml(
            response,
            400,
            renderCurrentLoginPage({
              baseUrl: postedBaseUrl,
              collection,
              state: sessionState,
              identity: postedIdentity || identity,
              error: error instanceof Error ? error.message : String(error)
            })
          );
          return;
        }
        if (!postedIdentity || !postedPassword) {
          writeHtml(
            response,
            400,
            renderCurrentLoginPage({
              baseUrl: postedBaseUrl,
              collection,
              state: sessionState,
              identity: postedIdentity || identity,
              error: "Identity and password are required."
            })
          );
          return;
        }
        try {
          const client = new PocketBaseRemoteClient({
            baseUrl: validatedPostedBaseUrl,
            collection,
            timeout: timeoutSeconds
          });
          const result = await client.login({
            identity: postedIdentity,
            password: postedPassword
          });
          await saveRemoteAuthResult(context, {
            result,
            action: "auth login",
            baseUrl: validatedPostedBaseUrl,
            collection
          });
          settled = true;
          writeHtml(response, 200, renderSuccessPage(validatedPostedBaseUrl, collection));
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          finalizeLogin = (async () => {
            const preflight = await runPreflightCheck(context, {
              requireAuth: true
            });
            const successMessage = context.jsonMode ? preflight.ready ? "Remote auth login successful and preflight passed" : "Remote auth login successful but preflight reported issues" : preflight.ready ? "Login successful\u2705" : "Login successful\u2705, but preflight reported issues. Run `pocketbase-cli preflight --require-auth` for details.";
            emitSuccess({
              jsonOutput: context.jsonMode,
              action,
              message: successMessage,
              data: context.jsonMode ? {
                auth: redactAuthResult(result),
                preflight
              } : void 0
            });
          })();
          server.close();
        } catch (error) {
          const message = error instanceof PocketBaseRemoteError ? error.message : error instanceof Error ? error.message : String(error);
          writeHtml(
            response,
            error instanceof PocketBaseRemoteError ? error.status : 500,
            renderCurrentLoginPage({
              baseUrl: postedBaseUrl ?? initialBaseUrl,
              collection,
              state: sessionState,
              identity: postedIdentity,
              error: message
            })
          );
        }
      });
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      });
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        emitError({
          jsonOutput: context.jsonMode,
          action,
          message: "Failed to determine the local browser login server address."
        });
      }
      launchUrl = `http://127.0.0.1:${address.port}${routePath}`;
      if (initialBaseUrl) {
        void probeAuthMethods({
          baseUrl: initialBaseUrl,
          collection,
          timeoutSeconds
        }).then((probedAuthMethods) => {
          if (probedAuthMethods) {
            loginPageView = buildLoginPageView(probedAuthMethods);
          }
        });
      }
      const autoOpened = options.open !== false ? await tryOpenBrowser(launchUrl) : false;
      writeLaunchMessage({
        url: launchUrl,
        autoOpened,
        timeoutSeconds
      });
      try {
        await new Promise((resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            if (!settled) {
              settled = true;
              server.close();
              reject(
                new Error(
                  `Browser login timed out after ${timeoutSeconds} seconds. Re-run the command to start a new session.`
                )
              );
            }
          }, timeoutMs);
          server.on("close", () => {
            if (settled) {
              resolve();
            }
          });
        });
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action,
          message: error instanceof Error ? error.message : String(error)
        });
      }
      if (finalizeLogin) {
        try {
          await finalizeLogin;
        } catch (error) {
          emitError({
            jsonOutput: context.jsonMode,
            action,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    })
  };
}

// src/commands/support.ts
var FILE_TOKEN_RESPONSE_ERROR_MESSAGE = "File token response did not include a usable token.";
function timeoutValue(context) {
  return context.state.config.timeout ?? null;
}
function validateBaseUrlForAction(context, options) {
  try {
    return parseBaseUrlValue(options.sourceName, options.baseUrl);
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action: options.action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input",
      hint: "Use https:// for remote PocketBase URLs, or http:// only for localhost/127.0.0.1/[::1]."
    });
  }
}
function buildRemoteClient(context, options) {
  const action = options?.action ?? "remote";
  const rawBaseUrl = resolveBaseUrl(context, options?.baseUrl);
  const collection = resolveAuthCollection(context, options?.collection);
  if (!rawBaseUrl) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: "Remote base URL is not configured. Run `config set base_url <url>` or use `auth login --base-url <url>` first.",
      errorType: "missing_prerequisite",
      hint: "Persist a base URL with `config set base_url <url>` or pass `auth login --base-url <url>`.",
      missingPrerequisite: "base_url"
    });
  }
  const baseUrl = validateBaseUrlForAction(context, {
    action,
    baseUrl: rawBaseUrl,
    sourceName: options?.baseUrl !== void 0 ? "--base-url" : "base_url"
  });
  const authBaseUrl = normalizeBaseUrl(context.state.remoteAuth.base_url);
  const authCollection = String(context.state.remoteAuth.collection ?? "_superusers");
  const savedToken = context.state.remoteAuth.token ?? null;
  const tokenMatchesTarget = Boolean(savedToken) && authBaseUrl === baseUrl && authCollection === collection;
  const token = tokenMatchesTarget ? savedToken : null;
  if ((options?.requireAuth ?? true) && savedToken && !tokenMatchesTarget) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: "Saved auth does not match the configured base URL or auth collection. Run `auth login` again.",
      errorType: "missing_prerequisite",
      hint: "Re-authenticate after changing `base_url` or `auth_collection`, or clear the saved auth with `auth logout`.",
      missingPrerequisite: "auth_login"
    });
  }
  if ((options?.requireAuth ?? true) && !token) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: "Remote auth token is missing. Run `auth login` first.",
      errorType: "missing_prerequisite",
      hint: "Authenticate with `auth login` before invoking remote admin endpoints.",
      missingPrerequisite: "auth_login"
    });
  }
  return new PocketBaseRemoteClient({
    baseUrl,
    token,
    collection,
    timeout: timeoutValue(context)
  });
}
function emitRemoteResult(context, options) {
  emitSuccess({
    jsonOutput: context.jsonMode,
    action: options.action,
    message: options.message,
    data: sanitizeRemoteResult(options.result)
  });
}
function handleRemoteError(context, action, error) {
  if (error instanceof PocketBaseRemoteError) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: error.message,
      data: error.toJSON(),
      httpStatus: error.status
    });
  }
  throw error;
}
async function runRemoteAction(context, options) {
  const client = buildRemoteClient(context, {
    action: options.action,
    requireAuth: options.requireAuth ?? true,
    baseUrl: options.baseUrl,
    collection: options.collection
  });
  try {
    const result = await options.operation(client);
    emitRemoteResult(context, {
      action: options.action,
      message: options.successMessage,
      result
    });
  } catch (error) {
    handleRemoteError(context, options.action, error);
  }
}
async function fetchAllPages(options) {
  const pageSize = options.perPage ?? 200;
  let page = 1;
  let totalItems = null;
  let fetchedPages = 0;
  const allItems = [];
  let lastResult = null;
  let done = false;
  while (!done) {
    const result = await options.fetchPage(page, pageSize);
    const payload = result.data;
    const items = Array.isArray(payload.items) ? payload.items : null;
    if (!items) {
      throw new Error(`${options.action} expected a paginated response with an \`items\` array`);
    }
    const totalItemsValue = typeof payload.totalItems === "number" ? payload.totalItems : null;
    const totalPagesValue = typeof payload.totalPages === "number" ? payload.totalPages : null;
    lastResult = result;
    fetchedPages += 1;
    allItems.push(...items);
    if (totalItemsValue !== null) {
      totalItems = totalItemsValue;
      if (allItems.length >= totalItemsValue) {
        done = true;
      }
    }
    if (!done && totalPagesValue !== null && page >= totalPagesValue) {
      done = true;
    }
    if (!done && items.length === 0) {
      done = true;
    }
    if (!done) {
      page += 1;
    }
  }
  if (!lastResult) {
    throw new Error(`${options.action} did not return any pages`);
  }
  return {
    method: lastResult.method,
    url: lastResult.url,
    status: lastResult.status,
    data: {
      page: 1,
      perPage: allItems.length || pageSize,
      totalItems: totalItems ?? allItems.length,
      totalPages: 1,
      items: allItems,
      fetchedAll: true,
      fetchedPages,
      nextPage: null
    }
  };
}
function requireConfirmation(context, options) {
  if (options.yes) {
    return true;
  }
  emitError({
    jsonOutput: context.jsonMode,
    action: options.action,
    message: options.message,
    errorType: "confirmation_required",
    hint: options.hint
  });
}
async function resolveFileToken(context, options) {
  try {
    const result = await options.client.filesToken();
    const payload = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
    const tokenValue = payload.token;
    if (typeof tokenValue !== "string" || !tokenValue.trim()) {
      emitError({
        jsonOutput: context.jsonMode,
        action: options.action,
        message: FILE_TOKEN_RESPONSE_ERROR_MESSAGE,
        data: sanitizeRemoteResult(result)
      });
    }
    return tokenValue;
  } catch (error) {
    handleRemoteError(context, options.action, error);
  }
}

// src/commands/auth.ts
async function confirmLogout() {
  const rl = (0, import_promises2.createInterface)({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const answer = (await rl.question("Confirm logout? ")).trim().toLowerCase();
    if (!answer) {
      return true;
    }
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
function createAuthLogoutDefinition(context) {
  return {
    name: "logout",
    path: "auth.logout",
    kind: "command",
    summary: "Clear saved remote auth state",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json auth logout --yes"],
    notes: ["In JSON mode (`--json`), `--yes` is required to skip the interactive confirmation prompt."],
    parameters: [
      createOptionParameter({
        name: "--yes",
        type: "BOOLEAN",
        help: "Skip interactive logout confirmation",
        isFlag: true
      })
    ],
    build: () => new Command("logout").description("Clear saved remote auth state").option("--yes", "Skip interactive logout confirmation").action(async (options) => {
      if (context.jsonMode && !options.yes) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "auth.logout",
          message: "JSON mode requires `auth logout --yes` to clear the saved auth session.",
          errorType: "confirmation_required",
          hint: "Re-run `auth logout --yes` after confirming the local saved auth session should be cleared."
        });
      }
      if (!options.yes && !context.jsonMode) {
        const confirmed = await confirmLogout();
        if (!confirmed) {
          emitSuccess({
            jsonOutput: context.jsonMode,
            action: "auth.logout",
            message: "Remote auth logout cancelled",
            data: {
              authenticated: context.state.hasRemoteAuth(),
              cancelled: true
            }
          });
          return;
        }
      }
      const historyParts = ["auth", "logout"];
      if (options.yes) {
        historyParts.push("--yes");
      }
      await recordCommand(context, historyParts.join(" "));
      context.state.clearRemoteAuth();
      await saveContextState(context);
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "auth.logout",
        message: "Remote auth logout successful",
        data: {
          authenticated: false
        }
      });
    })
  };
}
function createAuthStatusDefinition(context) {
  return {
    name: "status",
    path: "auth.status",
    kind: "command",
    summary: "Show remote auth status",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json auth status"],
    build: () => new Command("status").description("Show remote auth status").action(async () => {
      await recordCommand(context, "auth status");
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "auth.status",
        message: "Remote auth status",
        data: buildAuthStatusPayload(context)
      });
    })
  };
}
function createAuthWhoamiDefinition(context) {
  return {
    name: "whoami",
    path: "auth.whoami",
    kind: "command",
    summary: "Show current remote auth identity",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json auth whoami"],
    build: () => new Command("whoami").description("Show current remote auth identity").action(async () => {
      await recordCommand(context, "auth whoami");
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "auth.whoami",
        message: "Current remote auth identity",
        data: buildAuthStatusPayload(context)
      });
    })
  };
}
function createAuthRefreshDefinition(context) {
  return {
    name: "refresh",
    path: "auth.refresh",
    kind: "command",
    summary: "Refresh current remote auth token",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json auth refresh"],
    build: () => new Command("refresh").description("Refresh current remote auth token").action(async () => {
      await recordCommand(context, "auth refresh");
      const client = buildRemoteClient(context, {
        action: "auth.refresh",
        requireAuth: true
      });
      try {
        const result = await client.refresh();
        await saveRemoteAuthResult(context, {
          result,
          action: "auth refresh",
          baseUrl: client.baseUrl,
          collection: client.collection
        });
        emitSuccess({
          jsonOutput: context.jsonMode,
          action: "auth.refresh",
          message: "Remote auth refreshed",
          data: {
            auth: redactAuthResult(result)
          }
        });
      } catch (error) {
        if (error instanceof PocketBaseRemoteError) {
          handleRemoteError(context, "auth.refresh", error);
        }
        throw error;
      }
    })
  };
}
function createAuthDefinition(context) {
  return {
    name: "auth",
    path: "auth",
    kind: "group",
    summary: "Manage remote PocketBase auth session",
    authRequired: "varies",
    destructive: false,
    confirmationRequired: false,
    children: [
      createAuthLoginDefinition(context),
      createAuthLogoutDefinition(context),
      createAuthStatusDefinition(context),
      createAuthWhoamiDefinition(context),
      createAuthRefreshDefinition(context)
    ],
    build: () => new Command("auth").description("Manage remote PocketBase auth session")
  };
}

// src/commands/backups.ts
var import_node_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_node_path3 = require("path");
var import_node_stream = require("stream");
var import_promises4 = require("stream/promises");

// src/commands/confirmed-command.ts
var CONFIRMED_COMMAND_METADATA = {
  confirmationRequired: true,
  confirmationFlag: "--yes"
};
function createConfirmationParameter(help) {
  return createOptionParameter({
    name: "--yes",
    type: "BOOLEAN",
    help,
    isFlag: true
  });
}
function addConfirmationOption(command, help) {
  return command.option("--yes", help);
}
function requireConfirmedCommand(context, options) {
  return requireConfirmation(context, {
    action: options.action,
    yes: Boolean(options.yes),
    message: options.message,
    hint: options.hint
  });
}

// src/commands/history-builder.ts
function redactCommand(parts, sensitiveIndexes) {
  if (!sensitiveIndexes || sensitiveIndexes.size === 0) {
    return parts.join(" ");
  }
  return parts.map((part, index) => sensitiveIndexes.has(index) ? "********" : part).join(" ");
}
function buildPositionalRecordHistory(commandName, values, sensitiveValueIndexes) {
  const historyParts = ["records", commandName, ...values];
  const sensitiveIndexes = sensitiveValueIndexes && sensitiveValueIndexes.length > 0 ? new Set(sensitiveValueIndexes.map((index) => index + 2)) : void 0;
  return redactCommand(historyParts, sensitiveIndexes);
}
function buildRecordHistory(baseParts, segments) {
  const historyParts = [...baseParts];
  const sensitiveIndexes = /* @__PURE__ */ new Set();
  for (const segment of segments) {
    if (segment.kind === "flag") {
      if (segment.include) {
        historyParts.push(segment.flag);
      }
      continue;
    }
    if (segment.kind === "option") {
      const include = segment.include ?? (segment.value !== void 0 && segment.value !== null);
      if (!include) {
        continue;
      }
      historyParts.push(segment.flag);
      if (segment.value !== void 0 && segment.value !== null) {
        historyParts.push(segment.renderValue ?? segment.value);
      }
      continue;
    }
    historyParts.push(segment.renderValue ?? segment.value);
    if (segment.sensitive) {
      sensitiveIndexes.add(historyParts.length - 1);
    }
  }
  return redactCommand(historyParts, sensitiveIndexes.size > 0 ? sensitiveIndexes : void 0);
}

// src/commands/backups.ts
async function ensureUploadSource(filePath) {
  let fileStats;
  try {
    fileStats = await (0, import_promises3.stat)(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Backup file does not exist: ${filePath}`);
    }
    throw error;
  }
  if (!fileStats.isFile()) {
    throw new Error(`Backup upload path is not a file: ${filePath}`);
  }
  return {
    size: fileStats.size
  };
}
async function writePrivateFileStreamAtomic(path, stream) {
  await (0, import_promises3.mkdir)((0, import_node_path3.dirname)(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  const input = import_node_stream.Readable.fromWeb(stream);
  let size = 0;
  const counter = new import_node_stream.Transform({
    transform(chunk, _encoding, callback) {
      size += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
      callback(null, chunk);
    }
  });
  try {
    await (0, import_promises4.pipeline)(input, counter, (0, import_node_fs2.createWriteStream)(tempPath, { mode: 384 }));
    await (0, import_promises3.rename)(tempPath, path);
    await (0, import_promises3.chmod)(path, 384);
    return size;
  } catch (error) {
    await (0, import_promises3.rm)(tempPath, { force: true });
    throw error;
  }
}
function createBackupsDefinition(context) {
  return {
    name: "backups",
    path: "backups",
    kind: "group",
    summary: "Remote backup endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      {
        name: "list",
        path: "backups.list",
        kind: "command",
        summary: "List backup archives",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: ["pocketbase-cli --json backups list"],
        build: () => new Command("list").description("List backup archives").action(async () => {
          await recordCommand(context, "backups list");
          await runRemoteAction(context, {
            action: "backups.list",
            successMessage: "Backups list completed",
            operation: (client) => client.backupsList()
          });
        })
      },
      {
        name: "create",
        path: "backups.create",
        kind: "command",
        summary: "Create a new backup archive",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        parameters: [
          {
            kind: "option",
            name: "--name",
            names: ["--name"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "Optional backup archive name, for example snapshot.zip"
          }
        ],
        examples: ["pocketbase-cli --json backups create --name snapshot.zip"],
        build: () => new Command("create").description("Create a new backup archive").option("--name <name>", "Optional backup archive name, for example snapshot.zip").action(async (options) => {
          const historyParts = ["backups", "create"];
          if (options.name) {
            historyParts.push("--name", options.name);
          }
          await recordCommand(context, historyParts.join(" "));
          await runRemoteAction(context, {
            action: "backups.create",
            successMessage: "Backup create completed",
            operation: (client) => client.backupsCreate({
              name: options.name ?? null
            })
          });
        })
      },
      {
        name: "upload",
        path: "backups.upload",
        kind: "command",
        summary: "Upload a backup archive",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        parameters: [
          {
            kind: "argument",
            name: "file_path",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Path to the backup .zip archive to upload"
          }
        ],
        examples: ["pocketbase-cli --json backups upload ./pb_backup_20240101.zip"],
        build: () => new Command("upload").description("Upload a backup archive").argument("<file_path>").action(async (filePath) => {
          await recordCommand(context, `backups upload ${filePath}`);
          let fileSize;
          try {
            ({ size: fileSize } = await ensureUploadSource(filePath));
          } catch (error) {
            emitError({
              jsonOutput: context.jsonMode,
              action: "backups.upload",
              message: error instanceof Error ? error.message : String(error)
            });
          }
          const client = buildRemoteClient(context, {
            action: "backups.upload",
            requireAuth: true
          });
          try {
            const result = await client.backupsUpload({ filePath });
            emitSuccess({
              jsonOutput: context.jsonMode,
              action: "backups.upload",
              message: "Backup upload completed",
              data: {
                url: result.url,
                status: result.status,
                path: filePath,
                name: (0, import_node_path3.basename)(filePath),
                size: fileSize
              }
            });
          } catch (error) {
            if (error instanceof PocketBaseRemoteError) {
              handleRemoteError(context, "backups.upload", error);
            }
            emitError({
              jsonOutput: context.jsonMode,
              action: "backups.upload",
              message: `Failed to read backup file: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        })
      },
      {
        name: "delete",
        path: "backups.delete",
        kind: "command",
        summary: "Delete a backup archive",
        authRequired: true,
        destructive: true,
        ...CONFIRMED_COMMAND_METADATA,
        examples: ["pocketbase-cli --json backups delete pb_backup_20240101.zip --yes"],
        parameters: [
          {
            kind: "argument",
            name: "name",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Backup archive filename, for example pb_backup_20240101.zip"
          },
          createConfirmationParameter("Acknowledge that deleting a backup archive is destructive")
        ],
        build: () => {
          const command = new Command("delete").description("Delete a backup archive").argument("<name>");
          return addConfirmationOption(
            command,
            "Acknowledge that deleting a backup archive is destructive"
          ).action(async (name, options) => {
            requireConfirmedCommand(context, {
              action: "backups.delete",
              yes: options.yes,
              message: "Backup delete is destructive. Re-run with `--yes` to continue.",
              hint: "Re-run `backups delete <name> --yes` after confirming the archive should be removed."
            });
            await recordCommand(context, `backups delete ${name} --yes`);
            await runRemoteAction(context, {
              action: "backups.delete",
              successMessage: "Backup delete completed",
              operation: (client) => client.backupsDelete(name)
            });
          });
        }
      },
      {
        name: "download",
        path: "backups.download",
        kind: "command",
        summary: "Download a backup archive",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: [
          "pocketbase-cli --json backups download pb_backup_20240101.zip",
          "pocketbase-cli --json backups download pb_backup_20240101.zip --output ./my-backup.zip --overwrite"
        ],
        parameters: [
          {
            kind: "argument",
            name: "name",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Backup archive filename, for example pb_backup_20240101.zip"
          },
          {
            kind: "option",
            name: "--output",
            names: ["--output"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "Destination file path. Defaults to ./<name>"
          },
          {
            kind: "option",
            name: "--token",
            names: ["--token"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "Optional backup file token. If omitted the CLI will fetch one automatically",
            sensitive: true
          },
          {
            kind: "option",
            name: "--overwrite",
            names: ["--overwrite"],
            required: false,
            takes_value: false,
            is_flag: true,
            nargs: 1,
            type: "BOOLEAN",
            help: "Overwrite the destination file if it already exists"
          }
        ],
        build: () => new Command("download").description("Download a backup archive").argument("<name>").option("--output <path>", "Destination file path. Defaults to ./<name>").option(
          "--token <token>",
          "Optional backup file token. If omitted the CLI will fetch one automatically."
        ).option("--overwrite", "Overwrite the destination file if it already exists").action(
          async (name, options) => {
            const historyParts = ["backups", "download", name];
            if (options.output) {
              historyParts.push("--output", options.output);
            }
            if (options.overwrite) {
              historyParts.push("--overwrite");
            }
            const sensitiveIndexes = /* @__PURE__ */ new Set();
            if (options.token) {
              historyParts.push("--token", options.token);
              sensitiveIndexes.add(historyParts.length - 1);
            }
            await recordCommand(
              context,
              redactCommand(historyParts, sensitiveIndexes.size > 0 ? sensitiveIndexes : void 0)
            );
            const targetPath = options.output ?? (0, import_node_path3.join)(process.cwd(), (0, import_node_path3.basename)(name));
            if (!options.overwrite) {
              try {
                await (0, import_promises3.access)(targetPath);
                emitError({
                  jsonOutput: context.jsonMode,
                  action: "backups.download",
                  message: `Output file already exists: ${targetPath}. Pass \`--overwrite\` to replace it.`
                });
              } catch (error) {
                if (error.code !== "ENOENT") {
                  throw error;
                }
              }
            }
            const client = buildRemoteClient(context, {
              action: "backups.download",
              requireAuth: true
            });
            const resolvedToken = options.token ?? await resolveFileToken(context, {
              action: "backups.download",
              client
            });
            try {
              const result = await client.backupsDownload({
                name,
                token: resolvedToken
              });
              const size = await writePrivateFileStreamAtomic(targetPath, result.data);
              emitSuccess({
                jsonOutput: context.jsonMode,
                action: "backups.download",
                message: "Backup download completed",
                data: {
                  status: result.status,
                  path: targetPath,
                  size,
                  name
                }
              });
            } catch (error) {
              if (error instanceof PocketBaseRemoteError) {
                handleRemoteError(context, "backups.download", error);
              }
              emitError({
                jsonOutput: context.jsonMode,
                action: "backups.download",
                message: `Failed to write backup file: ${error instanceof Error ? error.message : String(error)}`
              });
            }
          }
        )
      },
      {
        name: "restore",
        path: "backups.restore",
        kind: "command",
        summary: "Restore a backup archive",
        authRequired: true,
        destructive: true,
        ...CONFIRMED_COMMAND_METADATA,
        examples: ["pocketbase-cli --json backups restore pb_backup_20240101.zip --yes"],
        notes: ["Restoring a backup replaces all current data and restarts the PocketBase application."],
        parameters: [
          {
            kind: "argument",
            name: "name",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Backup archive filename to restore"
          },
          createConfirmationParameter("Acknowledge that restore is destructive and restarts the app")
        ],
        build: () => {
          const command = new Command("restore").description("Restore a backup archive").argument("<name>");
          return addConfirmationOption(
            command,
            "Acknowledge that restore is destructive and restarts the app"
          ).action(async (name, options) => {
            requireConfirmedCommand(context, {
              action: "backups.restore",
              yes: options.yes,
              message: "Backup restore is destructive. Re-run with `--yes` to continue.",
              hint: "Re-run `backups restore <name> --yes` after confirming the remote app can be restarted."
            });
            await recordCommand(context, `backups restore ${name} --yes`);
            await runRemoteAction(context, {
              action: "backups.restore",
              successMessage: "Backup restore started",
              operation: (client) => client.backupsRestore(name)
            });
          });
        }
      }
    ],
    build: () => new Command("backups").description("Remote backup endpoints")
  };
}

// src/input/json-input.ts
var import_promises5 = require("fs/promises");
function parseJsonObject(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON body: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("JSON body must be an object");
  }
  return payload;
}
async function readStdinText(action) {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  const raw = chunks.join("");
  if (!raw.trim()) {
    throw new Error(`${action} expected JSON input on stdin.`);
  }
  return raw;
}
async function loadTextInput(options) {
  const fileIsStdin = options.filePath === "-";
  const explicitFilePath = options.filePath && options.filePath !== "-" ? options.filePath : void 0;
  const hasData = options.data !== void 0;
  const hasFile = options.filePath !== void 0;
  const hasStdinJson = Boolean(options.stdinJson);
  const providedSources = Number(hasData) + Number(hasFile) + Number(hasStdinJson);
  if (options.required && providedSources !== 1) {
    throw new Error(
      `${options.action} requires exactly one of \`--data\`, \`--file\`, or \`--stdin-json\`.`
    );
  }
  if (!options.required && providedSources > 1) {
    throw new Error(
      `${options.action} accepts at most one of \`--data\`, \`--file\`, or \`--stdin-json\`.`
    );
  }
  if (providedSources === 0) {
    return null;
  }
  if (options.stdinJson || fileIsStdin) {
    return readStdinText(options.action);
  }
  if (explicitFilePath) {
    try {
      return await (0, import_promises5.readFile)(explicitFilePath, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return options.data ?? "";
}
async function loadJsonObjectInput(options) {
  const raw = await loadTextInput({
    ...options,
    required: true
  });
  return parseJsonObject(raw ?? "");
}
async function loadOptionalJsonObjectInput(options) {
  const raw = await loadTextInput({
    ...options,
    required: false
  });
  return raw === null ? null : parseJsonObject(raw);
}

// src/input/remote-payloads.ts
var BATCH_ALLOWED_PATTERNS = /* @__PURE__ */ new Map([
  ["POST", /^\/api\/collections\/[^/?]+\/records(\?.*)?$/u],
  ["PUT", /^\/api\/collections\/[^/?]+\/records(\?.*)?$/u],
  ["PATCH", /^\/api\/collections\/[^/?]+\/records\/[^/?]+(\?.*)?$/u],
  ["DELETE", /^\/api\/collections\/[^/?]+\/records\/[^/?]+(\?.*)?$/u]
]);
function parseCollectionsImportPayload(payload) {
  const collections = payload.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error(
      "Collections import payload must contain a non-empty `collections` array"
    );
  }
  return payload;
}
function parseCollectionEnsurePayload(payload) {
  const name = payload.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("collections.ensure payload must include a non-empty `name`");
  }
  const lookupName = name.trim();
  return {
    body: {
      ...payload,
      name: lookupName
    },
    lookupName
  };
}
function parseBatchPayload(payload) {
  const requests = payload.requests;
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error("Batch payload must contain a non-empty `requests` array");
  }
  for (const [index, item] of requests.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Batch request ${index} must be an object`);
    }
    const record = item;
    const method = record.method;
    const url = record.url;
    if (typeof method !== "string" || !method.trim()) {
      throw new Error(`Batch request ${index} must include a string \`method\``);
    }
    if (typeof url !== "string" || !url.trim()) {
      throw new Error(`Batch request ${index} must include a string \`url\``);
    }
    const normalizedMethod = method.trim().toUpperCase();
    const normalizedUrl = url.trim();
    const allowedPattern = BATCH_ALLOWED_PATTERNS.get(normalizedMethod);
    if (!allowedPattern || !allowedPattern.test(normalizedUrl)) {
      throw new Error(
        `Batch request ${index} must target one of the supported record actions: POST/PUT /api/collections/<collection>/records, PATCH/DELETE /api/collections/<collection>/records/<id>`
      );
    }
    record.method = normalizedMethod;
    record.url = normalizedUrl;
    const body = record.body;
    if (body !== void 0 && (body === null || typeof body !== "object" || Array.isArray(body))) {
      throw new Error(`Batch request ${index} \`body\` must be a JSON object when provided`);
    }
    const headers = record.headers;
    if (headers !== void 0) {
      if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
        throw new Error(`Batch request ${index} \`headers\` must be an object when provided`);
      }
      for (const [key, value] of Object.entries(headers)) {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error(`Batch request ${index} \`headers\` keys and values must be strings`);
        }
      }
    }
  }
  return payload;
}

// src/commands/batch.ts
function buildHistory(options) {
  if (options.file === "-") {
    return "batch run --file -";
  }
  if (options.stdinJson) {
    return "batch run --stdin-json";
  }
  if (options.file) {
    return `batch run --file ${options.file}`;
  }
  if (options.data !== void 0) {
    return "batch run --data <json>";
  }
  return "batch run";
}
function createBatchDefinition(context) {
  return {
    name: "batch",
    path: "batch",
    kind: "group",
    summary: "Remote batch helpers",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      {
        name: "run",
        path: "batch.run",
        kind: "command",
        summary: "Run a validated PocketBase batch request",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: [
          `printf '{"requests":[{"method":"POST","url":"/api/collections/users/records","body":{"email":"demo@example.com"}}]}\\n' | pocketbase-cli --json batch run --stdin-json`
        ],
        notes: [
          "Only a constrained subset of record CRUD endpoints is accepted by `batch run`."
        ],
        inputSchema: createObjectInputSchema({
          description: "Validated PocketBase batch payload.",
          properties: {
            requests: {
              type: "array",
              description: "Non-empty array of record CRUD request objects."
            }
          },
          required: ["requests"],
          additionalProperties: true
        }),
        parameters: createJsonInputParameters(),
        build: () => new Command("run").description("Run a validated PocketBase batch request").option("--data <json>", "Batch payload JSON object").option("--file <path>", "Path to a JSON file containing the batch payload").option("--stdin-json", "Read the batch payload JSON object from stdin").action(async (options) => {
          let body;
          try {
            const payload = await loadJsonObjectInput({
              data: options.data,
              filePath: options.file,
              stdinJson: options.stdinJson,
              action: "batch.run"
            });
            body = parseBatchPayload(payload);
          } catch (error) {
            emitError({
              jsonOutput: context.jsonMode,
              action: "batch.run",
              message: error instanceof Error ? error.message : String(error)
            });
          }
          await recordCommand(context, buildHistory(options));
          await runRemoteAction(context, {
            action: "batch.run",
            successMessage: "Batch run completed",
            operation: (client) => client.batchRun({ body })
          });
        })
      }
    ],
    build: () => new Command("batch").description("Remote batch helpers")
  };
}

// src/commands/json-command.ts
function addJsonInputOptions(command) {
  return command.option("--data <json>", "JSON object body").option("--file <path>", "Path to a JSON file or `-` to read from stdin").option("--stdin-json", "Read the JSON object body from stdin");
}
function buildJsonInputHistory(base, options) {
  if (options.file === "-") {
    return `${base} --file -`;
  }
  if (options.stdinJson) {
    return `${base} --stdin-json`;
  }
  if (options.file) {
    return `${base} --file <path>`;
  }
  if (options.data !== void 0) {
    return `${base} --data <json>`;
  }
  return base;
}
async function loadJsonBody(action, options) {
  return loadJsonObjectInput({
    data: options.data,
    filePath: options.file,
    stdinJson: options.stdinJson,
    action
  });
}
async function loadJsonActionBody(context, options) {
  await recordCommand(context, buildJsonInputHistory(options.historyCommand, options.input));
  try {
    const body = await loadJsonBody(options.action, options.input);
    return options.validateBody ? options.validateBody(body) : body;
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action: options.action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input"
    });
  }
}
function createJsonRemoteCommand(options) {
  return {
    name: options.name,
    path: options.path,
    kind: "command",
    summary: options.summary,
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: options.examples,
    notes: options.notes,
    inputSchema: options.inputSchema ?? createObjectInputSchema(),
    parameters: createJsonInputParameters(),
    build: () => addJsonInputOptions(new Command(options.name).description(options.summary)).action(
      async (input) => {
        const body = await loadJsonActionBody(options.context, {
          action: options.path,
          historyCommand: options.historyCommand,
          input,
          validateBody: options.validateBody
        });
        await runRemoteAction(options.context, {
          action: options.path,
          successMessage: options.successMessage,
          operation: (client) => options.run(client, body)
        });
      }
    )
  };
}

// src/commands/collections.ts
function parseNumber(context, action, optionName, value, minimum = 1) {
  if (value === void 0) {
    return void 0;
  }
  try {
    return parseIntegerOptionValue(optionName, value, { min: minimum });
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input"
    });
  }
}
function listParameters() {
  return [
    createOptionParameter({
      name: "--page",
      type: "INTEGER",
      help: "Page number for paginated collection listing"
    }),
    createOptionParameter({
      name: "--per-page",
      type: "INTEGER",
      help: "Number of collections per page"
    }),
    createOptionParameter({
      name: "--filter",
      type: "TEXT",
      help: `PocketBase filter expression, e.g. 'name = "users"'`
    }),
    createOptionParameter({
      name: "--sort",
      type: "TEXT",
      help: "PocketBase sort expression, e.g. '-created,+name' (prefix: + ascending, - descending)"
    }),
    createOptionParameter({
      name: "--all",
      type: "BOOLEAN",
      help: "Fetch every page and merge the result into a single payload",
      isFlag: true
    })
  ];
}
function ensureParameters() {
  return [
    ...createJsonInputParameters(),
    createOptionParameter({
      name: "--if-exists",
      type: "TEXT",
      help: "Behavior when the collection already exists",
      default: "update",
      choices: ["update", "fail"]
    }),
    createOptionParameter({
      name: "--if-missing",
      type: "TEXT",
      help: "Behavior when the collection does not exist",
      default: "create",
      choices: ["create", "fail"]
    }),
    createOptionParameter({
      name: "--output",
      type: "TEXT",
      help: "Successful response detail level",
      default: "full",
      choices: ["summary", "full"]
    })
  ];
}
function normalizeEnsurePolicies(options) {
  const ifExists = (options.ifExists ?? "update").toLowerCase();
  const ifMissing = (options.ifMissing ?? "create").toLowerCase();
  const outputMode = (options.output ?? "full").toLowerCase();
  if (ifExists !== "update" && ifExists !== "fail") {
    throw new Error("collections.ensure expects `--if-exists` to be `update` or `fail`.");
  }
  if (ifMissing !== "create" && ifMissing !== "fail") {
    throw new Error("collections.ensure expects `--if-missing` to be `create` or `fail`.");
  }
  if (outputMode !== "summary" && outputMode !== "full") {
    throw new Error("collections.ensure expects `--output` to be `summary` or `full`.");
  }
  return {
    ifExists,
    ifMissing,
    outputMode
  };
}
function createCollectionsListDefinition(context) {
  return {
    name: "list",
    path: "collections.list",
    kind: "command",
    summary: "List remote collections",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json collections list",
      "pocketbase-cli --json collections list --all"
    ],
    parameters: listParameters(),
    build: () => new Command("list").description("List remote collections").option("--page <number>", "Page number").option("--per-page <number>", "Results per page").option("--filter <filter>", "Filter expression").option("--sort <sort>", "Sort spec").option("--all", "Fetch all pages and merge them into a single result payload").action(async (options) => {
      await recordCommand(context, "collections list");
      const page = parseNumber(context, "collections.list", "--page", options.page);
      const perPage = parseNumber(context, "collections.list", "--per-page", options.perPage);
      await runRemoteAction(context, {
        action: "collections.list",
        successMessage: "Collections list completed",
        operation: (client) => options.all ? fetchAllPages({
          action: "collections.list",
          perPage,
          fetchPage: (currentPage, currentPerPage) => client.collectionsList({
            page: currentPage,
            perPage: currentPerPage,
            filterValue: options.filter,
            sort: options.sort
          })
        }) : client.collectionsList({
          page,
          perPage,
          filterValue: options.filter,
          sort: options.sort
        })
      });
    })
  };
}
function createCollectionsGetDefinition(context) {
  return {
    name: "get",
    path: "collections.get",
    kind: "command",
    summary: "Fetch a single collection",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json collections get users"],
    parameters: [
      createArgumentParameter({
        name: "name_or_id",
        help: "Collection name or collection id"
      })
    ],
    build: () => new Command("get").description("Fetch a collection by name or id").argument("<name_or_id>").action(async (nameOrId) => {
      await recordCommand(context, `collections get ${nameOrId}`);
      await runRemoteAction(context, {
        action: "collections.get",
        successMessage: "Collection fetch completed",
        operation: (client) => client.collectionsGet(nameOrId)
      });
    })
  };
}
function createCollectionsUpdateDefinition(context) {
  return {
    name: "update",
    path: "collections.update",
    kind: "command",
    summary: "Update a collection",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `printf '{"name":"users","indexes":[]}\\n' | pocketbase-cli --json collections update users --stdin-json`
    ],
    notes: ["The input body should be a full or partial PocketBase collection definition."],
    inputSchema: createObjectInputSchema({
      description: "PocketBase collection definition payload.",
      additionalProperties: true
    }),
    parameters: [
      createArgumentParameter({
        name: "name_or_id",
        help: "Collection name or collection id"
      }),
      ...createJsonInputParameters()
    ],
    build: () => addJsonInputOptions(
      new Command("update").description("Update a collection").argument("<name_or_id>")
    ).action(async (nameOrId, input) => {
      const body = await loadJsonActionBody(context, {
        action: "collections.update",
        historyCommand: `collections update ${nameOrId}`,
        input
      });
      await runRemoteAction(context, {
        action: "collections.update",
        successMessage: "Collection update completed",
        operation: (client) => client.collectionsUpdate({
          nameOrId,
          body
        })
      });
    })
  };
}
function createCollectionsEnsureDefinition(context) {
  return {
    name: "ensure",
    path: "collections.ensure",
    kind: "command",
    summary: "Create or update a collection idempotently",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `printf '{"name":"users","type":"base"}\\n' | pocketbase-cli --json collections ensure --stdin-json`,
      "pocketbase-cli --json collections ensure --file collection.json --if-exists fail --output summary"
    ],
    notes: [
      "`collections.ensure` requires a non-empty `name` in the JSON body.",
      "Use `--output summary` when the caller only needs the operation result instead of the full collection payload."
    ],
    inputSchema: createObjectInputSchema({
      description: "PocketBase collection definition used for idempotent ensure.",
      properties: {
        name: {
          type: "string",
          description: "Collection name used to resolve an existing collection before update."
        }
      },
      required: ["name"],
      additionalProperties: true
    }),
    parameters: ensureParameters(),
    build: () => addJsonInputOptions(
      new Command("ensure").description("Create or update a collection idempotently")
    ).option("--if-exists <mode>", "Behavior when the collection already exists", "update").option("--if-missing <mode>", "Behavior when the collection does not exist", "create").option("--output <mode>", "Successful response detail level", "full").action(
      async (input) => {
        const historyParts = [buildJsonInputHistory("collections ensure", input)];
        if (input.ifExists && input.ifExists !== "update") {
          historyParts.push(`--if-exists ${input.ifExists}`);
        }
        if (input.ifMissing && input.ifMissing !== "create") {
          historyParts.push(`--if-missing ${input.ifMissing}`);
        }
        if (input.output && input.output !== "full") {
          historyParts.push(`--output ${input.output}`);
        }
        await recordCommand(context, historyParts.join(" "));
        let body;
        let lookupName;
        let ifExists;
        let ifMissing;
        let outputMode;
        try {
          body = await loadJsonBody("collections.ensure", input);
          ({ body, lookupName } = parseCollectionEnsurePayload(body));
          ({ ifExists, ifMissing, outputMode } = normalizeEnsurePolicies(input));
        } catch (error) {
          emitError({
            jsonOutput: context.jsonMode,
            action: "collections.ensure",
            message: error instanceof Error ? error.message : String(error),
            errorType: "invalid_input"
          });
        }
        const client = buildRemoteClient(context, {
          action: "collections.ensure",
          requireAuth: true
        });
        let matched = null;
        try {
          const existing = await client.collectionsGet(lookupName);
          if (existing.data && typeof existing.data === "object" && !Array.isArray(existing.data)) {
            matched = existing.data;
          }
          if (ifExists === "fail") {
            emitError({
              jsonOutput: context.jsonMode,
              action: "collections.ensure",
              message: `Collection \`${lookupName}\` already exists and \`--if-exists fail\` was requested.`,
              errorType: "invalid_input",
              hint: "Remove `--if-exists fail` to update the collection, or use `collections update` explicitly.",
              data: {
                lookup_name: lookupName,
                matched,
                if_exists: ifExists
              }
            });
          }
          const result = await client.collectionsUpdate({
            nameOrId: lookupName,
            body
          });
          emitEnsureSuccess(context, {
            result,
            operation: "update",
            lookupName,
            matched,
            ifExists,
            ifMissing,
            outputMode
          });
        } catch (error) {
          if (!(error instanceof PocketBaseRemoteError) || error.status !== 404) {
            handleRemoteError(context, "collections.ensure", error);
          }
          if (ifMissing === "fail") {
            emitError({
              jsonOutput: context.jsonMode,
              action: "collections.ensure",
              message: `Collection \`${lookupName}\` does not exist and \`--if-missing fail\` was requested.`,
              errorType: "not_found",
              hint: "Remove `--if-missing fail` to create the collection, or create it explicitly with `collections create`.",
              data: {
                lookup_name: lookupName,
                if_missing: ifMissing
              },
              httpStatus: 404
            });
          }
          try {
            const result = await client.collectionsCreate({ body });
            emitEnsureSuccess(context, {
              result,
              operation: "create",
              lookupName,
              matched,
              ifExists,
              ifMissing,
              outputMode
            });
          } catch (createError) {
            handleRemoteError(context, "collections.ensure", createError);
          }
        }
      }
    )
  };
}
function emitEnsureSuccess(context, options) {
  const payload = options.result.data && typeof options.result.data === "object" && !Array.isArray(options.result.data) ? options.result.data : {};
  if (options.outputMode === "summary") {
    emitSuccess({
      jsonOutput: context.jsonMode,
      action: "collections.ensure",
      message: "Collection ensure completed",
      data: {
        operation: options.operation,
        lookup_name: options.lookupName,
        existed: options.matched !== null,
        status: options.result.status,
        collection: {
          id: payload.id ?? null,
          name: payload.name ?? null,
          type: payload.type ?? null
        },
        field_count: Array.isArray(payload.fields) ? payload.fields.length : null,
        policies: {
          if_exists: options.ifExists,
          if_missing: options.ifMissing
        },
        output: options.outputMode
      }
    });
    return;
  }
  const data = sanitizeRemoteValue({
    operation: options.operation,
    lookup_name: options.lookupName,
    matched: options.matched,
    if_exists: options.ifExists,
    if_missing: options.ifMissing,
    output: options.outputMode,
    data: options.result.data,
    method: options.result.method,
    url: options.result.url,
    status: options.result.status
  });
  emitSuccess({
    jsonOutput: context.jsonMode,
    action: "collections.ensure",
    message: "Collection ensure completed",
    data
  });
}
function createCollectionsDeleteDefinition(context) {
  return {
    name: "delete",
    path: "collections.delete",
    kind: "command",
    summary: "Delete a collection",
    authRequired: true,
    destructive: true,
    ...CONFIRMED_COMMAND_METADATA,
    examples: ["pocketbase-cli --json collections delete users --yes"],
    parameters: [
      {
        kind: "argument",
        name: "name_or_id",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "Collection name or collection id"
      },
      createConfirmationParameter("Acknowledge that deleting a collection is destructive")
    ],
    build: () => {
      const command = new Command("delete").description("Delete a collection").argument("<name_or_id>");
      return addConfirmationOption(
        command,
        "Acknowledge that deleting a collection is destructive"
      ).action(async (nameOrId, options) => {
        requireConfirmedCommand(context, {
          action: "collections.delete",
          yes: options.yes,
          message: "Collection delete is destructive. Re-run with `--yes` to continue.",
          hint: "Re-run `collections delete <name_or_id> --yes` once you have verified the target collection."
        });
        await recordCommand(context, `collections delete ${nameOrId} --yes`);
        await runRemoteAction(context, {
          action: "collections.delete",
          successMessage: "Collection delete completed",
          operation: (client) => client.collectionsDelete(nameOrId)
        });
      });
    }
  };
}
function createCollectionsTruncateDefinition(context) {
  return {
    name: "truncate",
    path: "collections.truncate",
    kind: "command",
    summary: "Remove all records from a collection",
    authRequired: true,
    destructive: true,
    ...CONFIRMED_COMMAND_METADATA,
    examples: ["pocketbase-cli --json collections truncate users --yes"],
    parameters: [
      {
        kind: "argument",
        name: "name_or_id",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "Collection name or collection id"
      },
      createConfirmationParameter("Acknowledge that truncating a collection removes all records")
    ],
    build: () => {
      const command = new Command("truncate").description("Truncate a collection").argument("<name_or_id>");
      return addConfirmationOption(
        command,
        "Acknowledge that truncating a collection removes all records"
      ).action(async (nameOrId, options) => {
        requireConfirmedCommand(context, {
          action: "collections.truncate",
          yes: options.yes,
          message: "Collection truncate is destructive. Re-run with `--yes` to continue.",
          hint: "Re-run `collections truncate <name_or_id> --yes` after confirming the collection should be emptied."
        });
        await recordCommand(context, `collections truncate ${nameOrId} --yes`);
        await runRemoteAction(context, {
          action: "collections.truncate",
          successMessage: "Collection truncate completed",
          operation: (client) => client.collectionsTruncate(nameOrId)
        });
      });
    }
  };
}
function createCollectionsDefinition(context) {
  return {
    name: "collections",
    path: "collections",
    kind: "group",
    summary: "Remote collections endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      createCollectionsListDefinition(context),
      createCollectionsGetDefinition(context),
      createJsonRemoteCommand({
        context,
        name: "create",
        path: "collections.create",
        summary: "Create a collection",
        successMessage: "Collection create completed",
        historyCommand: "collections create",
        examples: [
          `printf '{"name":"users","type":"base"}\\n' | pocketbase-cli --json collections create --stdin-json`
        ],
        inputSchema: createObjectInputSchema({
          description: "PocketBase collection definition payload.",
          properties: {
            name: { type: "string" },
            type: { type: "string" }
          },
          required: ["name"],
          additionalProperties: true
        }),
        run: (client, body) => client.collectionsCreate({ body })
      }),
      createCollectionsUpdateDefinition(context),
      createCollectionsEnsureDefinition(context),
      createCollectionsDeleteDefinition(context),
      createCollectionsTruncateDefinition(context),
      createJsonRemoteCommand({
        context,
        name: "import",
        path: "collections.import",
        summary: "Import collections payload",
        successMessage: "Collections import completed",
        historyCommand: "collections import",
        examples: [
          `printf '{"collections":[{"name":"users","type":"base"}]}\\n' | pocketbase-cli --json collections import --stdin-json`
        ],
        inputSchema: createObjectInputSchema({
          description: "Collections import payload.",
          properties: {
            collections: {
              type: "array",
              description: "Non-empty array of PocketBase collection definitions."
            }
          },
          required: ["collections"],
          additionalProperties: true
        }),
        validateBody: parseCollectionsImportPayload,
        run: (client, body) => client.collectionsImport({ body })
      }),
      {
        name: "scaffolds",
        path: "collections.scaffolds",
        kind: "command",
        summary: "Fetch collection scaffolds metadata",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: ["pocketbase-cli --json collections scaffolds"],
        build: () => new Command("scaffolds").description("Fetch collection scaffolds metadata").action(async () => {
          await recordCommand(context, "collections scaffolds");
          await runRemoteAction(context, {
            action: "collections.scaffolds",
            successMessage: "Collection scaffolds fetch completed",
            operation: (client) => client.collectionsScaffolds()
          });
        })
      }
    ],
    build: () => new Command("collections").description("Remote collections endpoints")
  };
}

// src/commands/config.ts
function createConfigShowCommand(context) {
  return {
    name: "show",
    path: "config.show",
    kind: "command",
    summary: "Show persisted remote defaults",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json config show"],
    parameters: [],
    build: () => new Command("show").description("Show persisted remote defaults").action(() => {
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "config.show",
        message: "Current config",
        data: context.state.config
      });
    })
  };
}
function createConfigSetCommand(context) {
  return {
    name: "set",
    path: "config.set",
    kind: "command",
    summary: "Persist remote default value",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    parameters: [
      {
        kind: "argument",
        name: "key",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "Config key to persist: base_url, auth_collection, or timeout"
      },
      {
        kind: "argument",
        name: "value",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "Config value. Use none, null, or unset to clear the key"
      }
    ],
    examples: [
      "pocketbase-cli --json config set base_url https://pb.example.com",
      "pocketbase-cli --json config set timeout 30"
    ],
    build: () => new Command("set").description("Persist remote default value").argument("<key>").argument("<value>").action(async (key, value) => {
      if (!isConfigKey(key)) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "config.set",
          message: `Unknown config key: ${key}`
        });
      }
      let parsed;
      try {
        parsed = parseConfigValue(key, value);
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "config.set",
          message: error instanceof Error ? error.message : String(error)
        });
      }
      const payload = context.state.setConfig(key, parsed);
      const authChange = clearRemoteAuthIfConfigTargetChanged(context);
      await recordCommand(context, `config set ${key} ${quoteForHistory(value)}`);
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "config.set",
        message: authChange.auth_cleared ? "Config updated and saved auth cleared" : "Config updated",
        data: {
          ...payload,
          ...authChange
        }
      });
    })
  };
}
function createConfigUnsetCommand(context) {
  return {
    name: "unset",
    path: "config.unset",
    kind: "command",
    summary: "Remove persisted remote default",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    parameters: [
      {
        kind: "argument",
        name: "key",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "Config key to remove: base_url, auth_collection, or timeout"
      }
    ],
    examples: ["pocketbase-cli --json config unset timeout"],
    build: () => new Command("unset").description("Remove persisted remote default").argument("<key>").action(async (key) => {
      if (!isConfigKey(key)) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "config.unset",
          message: `Unknown config key: ${key}`
        });
      }
      const payload = context.state.unsetConfig(key);
      const authChange = clearRemoteAuthIfConfigTargetChanged(context);
      await recordCommand(context, `config unset ${key}`);
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "config.unset",
        message: authChange.auth_cleared ? "Config removed and saved auth cleared" : "Config removed",
        data: {
          ...payload,
          ...authChange
        }
      });
    })
  };
}
function createConfigDefinition(context) {
  return {
    name: "config",
    path: "config",
    kind: "group",
    summary: "Persist remote defaults for future commands",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    children: [
      createConfigShowCommand(context),
      createConfigSetCommand(context),
      createConfigUnsetCommand(context)
    ],
    build: () => new Command("config").description("Persist remote defaults for future commands")
  };
}

// src/commands/crons.ts
function createCronsDefinition(context) {
  return {
    name: "crons",
    path: "crons",
    kind: "group",
    summary: "Remote cron endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      {
        name: "list",
        path: "crons.list",
        kind: "command",
        summary: "List cron jobs",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: ["pocketbase-cli --json crons list"],
        build: () => new Command("list").description("List cron jobs").action(async () => {
          await recordCommand(context, "crons list");
          await runRemoteAction(context, {
            action: "crons.list",
            successMessage: "Crons list completed",
            operation: (client) => client.cronsList()
          });
        })
      },
      {
        name: "run",
        path: "crons.run",
        kind: "command",
        summary: "Run a cron job",
        authRequired: true,
        destructive: true,
        ...CONFIRMED_COMMAND_METADATA,
        parameters: [
          {
            kind: "argument",
            name: "job_id",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Cron job id to run immediately"
          },
          createConfirmationParameter(
            "Acknowledge that running the cron job can trigger side effects immediately"
          )
        ],
        examples: ["pocketbase-cli --json crons run cleanup --yes"],
        build: () => {
          const command = new Command("run").description("Run a cron job now").argument("<job_id>");
          return addConfirmationOption(
            command,
            "Acknowledge that running a cron job can trigger side effects immediately"
          ).action(async (jobId, options) => {
            requireConfirmedCommand(context, {
              action: "crons.run",
              yes: options.yes,
              message: "Cron run can trigger side effects immediately. Re-run with `--yes` to continue.",
              hint: "Re-run `crons run <job_id> --yes` after confirming the job should execute now."
            });
            await recordCommand(context, `crons run ${jobId} --yes`);
            await runRemoteAction(context, {
              action: "crons.run",
              successMessage: "Cron run completed",
              operation: (client) => client.cronsRun(jobId)
            });
          });
        }
      }
    ],
    build: () => new Command("crons").description("Remote cron endpoints")
  };
}

// src/commands/files.ts
var REDACTED_SECRET2 = "********";
function sanitizeTokenizedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", REDACTED_SECRET2);
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&]token=)[^&#]+/giu, `$1${REDACTED_SECRET2}`);
  }
}
function createFilesDefinition(context) {
  return {
    name: "files",
    path: "files",
    kind: "group",
    summary: "Remote file helpers",
    authRequired: "conditional",
    destructive: false,
    confirmationRequired: false,
    children: [
      {
        name: "token",
        path: "files.token",
        kind: "command",
        summary: "Generate a temporary file token",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        examples: ["pocketbase-cli --json files token"],
        build: () => new Command("token").description("Generate a temporary file token").action(async () => {
          await recordCommand(context, "files token");
          await runRemoteAction(context, {
            action: "files.token",
            successMessage: "File token generated",
            operation: (client) => client.filesToken()
          });
        })
      },
      {
        name: "url",
        path: "files.url",
        kind: "command",
        summary: "Build a PocketBase file URL",
        authRequired: "conditional",
        destructive: false,
        confirmationRequired: false,
        parameters: [
          {
            kind: "argument",
            name: "collection",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Collection name or id that owns the file"
          },
          {
            kind: "argument",
            name: "record_id",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Record id that owns the file"
          },
          {
            kind: "argument",
            name: "filename",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Stored file name to include in the generated URL"
          },
          {
            kind: "option",
            name: "--thumb",
            names: ["--thumb"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "PocketBase thumbnail spec, for example 100x100"
          },
          {
            kind: "option",
            name: "--download",
            names: ["--download"],
            required: false,
            takes_value: false,
            is_flag: true,
            nargs: 1,
            type: "BOOLEAN",
            help: "Append download=1 so PocketBase serves the file as an attachment"
          },
          {
            kind: "option",
            name: "--token",
            names: ["--token"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "File token query parameter to append to the generated URL"
          },
          {
            kind: "option",
            name: "--with-token",
            names: ["--with-token"],
            required: false,
            takes_value: false,
            is_flag: true,
            nargs: 1,
            type: "BOOLEAN",
            help: "Fetch a temporary file token and append it automatically"
          },
          {
            kind: "option",
            name: "--reveal-token",
            names: ["--reveal-token"],
            required: false,
            takes_value: false,
            is_flag: true,
            nargs: 1,
            type: "BOOLEAN",
            help: "Reveal the resolved token and signed URL instead of redacting sensitive output"
          }
        ],
        examples: [
          "pocketbase-cli --json files url users RECORD_ID avatar.png",
          "pocketbase-cli --json files url users RECORD_ID avatar.png --thumb 100x100 --with-token"
        ],
        build: () => new Command("url").description("Build a PocketBase file URL").argument("<collection>").argument("<record_id>").argument("<filename>").option("--thumb <spec>", "PocketBase thumb spec, for example 100x100").option("--download", "Force download with PocketBase download=1").option("--token <token>", "Optional file token query parameter").option("--with-token", "Fetch a temporary file token and append it automatically").option("--reveal-token", "Print the resolved token and signed file URL to stdout").action(
          async (collection, recordId, filename, options) => {
            if (options.token && options.withToken) {
              emitError({
                jsonOutput: context.jsonMode,
                action: "files.url",
                message: "Use either `--token` or `--with-token`, not both.",
                errorType: "invalid_input"
              });
            }
            if (options.revealToken && !options.token && !options.withToken) {
              emitError({
                jsonOutput: context.jsonMode,
                action: "files.url",
                message: "Use `--reveal-token` only together with `--token` or `--with-token`.",
                errorType: "invalid_input"
              });
            }
            const tokenHistorySegments = options.token ? [
              { kind: "value", value: "--token" },
              { kind: "value", value: options.token, sensitive: true }
            ] : [];
            await recordCommand(
              context,
              buildRecordHistory(
                ["files", "url", collection, recordId, filename],
                [
                  { kind: "option", flag: "--thumb", value: options.thumb },
                  { kind: "flag", flag: "--download", include: Boolean(options.download) },
                  ...tokenHistorySegments,
                  { kind: "flag", flag: "--with-token", include: Boolean(options.withToken) },
                  { kind: "flag", flag: "--reveal-token", include: Boolean(options.revealToken) }
                ]
              )
            );
            const client = buildRemoteClient(context, {
              action: "files.url",
              requireAuth: Boolean(options.withToken)
            });
            let resolvedToken = options.token ?? null;
            if (options.withToken) {
              resolvedToken = await resolveFileToken(context, {
                action: "files.url",
                client
              });
            }
            const rawUrl = client.buildFileUrl({
              collection,
              recordId,
              filename,
              thumb: options.thumb ?? null,
              download: Boolean(options.download)
            });
            const signedUrl = client.buildFileUrl({
              collection,
              recordId,
              filename,
              thumb: options.thumb ?? null,
              download: Boolean(options.download),
              token: resolvedToken
            });
            const tokenSource = options.withToken ? "generated" : options.token ? "provided" : null;
            const revealToken = Boolean(options.revealToken && resolvedToken);
            emitSuccess({
              jsonOutput: context.jsonMode,
              action: "files.url",
              message: "File URL generated",
              data: {
                url: rawUrl,
                collection,
                record_id: recordId,
                filename,
                thumb: options.thumb ?? null,
                download: Boolean(options.download),
                token: resolvedToken ? revealToken ? resolvedToken : REDACTED_SECRET2 : null,
                token_applied: Boolean(resolvedToken),
                token_source: tokenSource,
                url_with_token: resolvedToken ? revealToken ? signedUrl : sanitizeTokenizedUrl(signedUrl) : null,
                sensitive_output: revealToken
              }
            });
          }
        )
      }
    ],
    build: () => new Command("files").description("Remote file helpers")
  };
}

// src/commands/history.ts
function createUndoDefinition(context) {
  return {
    name: "undo",
    path: "undo",
    kind: "command",
    summary: "Undo the last config mutation",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json undo"],
    build: () => new Command("undo").description("Undo the last config mutation").action(async () => {
      try {
        const payload = context.state.undo();
        const authChange = clearRemoteAuthIfConfigTargetChanged(context);
        await recordCommand(context, "undo");
        emitSuccess({
          jsonOutput: context.jsonMode,
          action: "undo",
          message: authChange.auth_cleared ? "Undo applied and saved auth cleared" : "Undo applied",
          data: {
            ...payload,
            ...authChange
          }
        });
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "undo",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    })
  };
}
function createRedoDefinition(context) {
  return {
    name: "redo",
    path: "redo",
    kind: "command",
    summary: "Redo the last undone config mutation",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json redo"],
    build: () => new Command("redo").description("Redo the last undone config mutation").action(async () => {
      try {
        const payload = context.state.redo();
        const authChange = clearRemoteAuthIfConfigTargetChanged(context);
        await recordCommand(context, "redo");
        emitSuccess({
          jsonOutput: context.jsonMode,
          action: "redo",
          message: authChange.auth_cleared ? "Redo applied and saved auth cleared" : "Redo applied",
          data: {
            ...payload,
            ...authChange
          }
        });
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "redo",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    })
  };
}
function createHistoryDefinition(context) {
  return {
    name: "history",
    path: "history",
    kind: "command",
    summary: "Show recent command history",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    parameters: [
      {
        kind: "option",
        name: "--limit",
        names: ["--limit"],
        required: false,
        takes_value: true,
        is_flag: false,
        nargs: 1,
        default: 20,
        type: "INTEGER",
        help: "Maximum number of recent command history items to show"
      }
    ],
    examples: ["pocketbase-cli --json history --limit 10"],
    build: () => new Command("history").description("Show recent command history").option("--limit <n>", "Number of items to show", "20").action((options) => {
      let parsedLimit;
      try {
        parsedLimit = parseIntegerOptionValue("--limit", options.limit ?? "20", { min: 1 });
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "history",
          message: error instanceof Error ? error.message : String(error),
          errorType: "invalid_input"
        });
      }
      const limit = parsedLimit;
      const items = context.state.commandHistory.slice(-limit);
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "history",
        message: "Recent command history",
        data: { items }
      });
    })
  };
}
function createHistoryCommandDefinitions(context) {
  return [
    createUndoDefinition(context),
    createRedoDefinition(context),
    createHistoryDefinition(context)
  ];
}

// src/commands/info.ts
async function probeHealth2(context) {
  const rawResolvedBaseUrl = resolveBaseUrl(context);
  if (!rawResolvedBaseUrl) {
    return null;
  }
  let resolvedBaseUrl;
  try {
    resolvedBaseUrl = parseBaseUrlValue("base_url", rawResolvedBaseUrl);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      status: 0,
      url: rawResolvedBaseUrl
    };
  }
  const client = new PocketBaseRemoteClient({
    baseUrl: resolvedBaseUrl,
    token: context.state.remoteAuth.token,
    collection: resolveAuthCollection(context),
    timeout: context.state.config.timeout ?? null
  });
  try {
    const result = await client.raw({
      method: "GET",
      path: "/api/health",
      requireAuth: false
    });
    return {
      ok: true,
      status: result.status,
      data: result.data
    };
  } catch (error) {
    if (error instanceof PocketBaseRemoteError) {
      return {
        ok: false,
        message: error.message,
        status: error.status,
        url: error.url
      };
    }
    throw error;
  }
}
function createInfoDefinition(context) {
  return {
    name: "info",
    path: "info",
    kind: "command",
    summary: "Show remote mode details, config, auth state, and health check",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json info"],
    build: () => new Command("info").description("Show remote mode details, config, auth state, and health check").action(async () => {
      await recordCommand(context, "info");
      const remoteAuth = context.state.remoteAuth;
      const payload = {
        mode: "remote",
        active_config: context.state.config,
        env_config: {
          base_url: context.envConfig?.base_url ?? null,
          base_url_error: context.envConfig?.base_url_error ?? null
        },
        resolved_base_url: resolveBaseUrl(context),
        resolved_auth_collection: resolveAuthCollection(context),
        remote_auth: {
          authenticated: context.state.hasRemoteAuth(),
          base_url: remoteAuth.base_url ?? null,
          collection: remoteAuth.collection ?? null,
          record: sanitizeRemoteValue(remoteAuth.record ?? null)
        },
        health: await probeHealth2(context)
      };
      emitSuccess({
        jsonOutput: context.jsonMode,
        action: "info",
        message: "PocketBase remote CLI info",
        data: payload
      });
    })
  };
}

// src/commands/logs.ts
function parseNumber2(context, action, optionName, value, minimum = 1) {
  if (value === void 0) {
    return void 0;
  }
  try {
    return parseIntegerOptionValue(optionName, value, { min: minimum });
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input"
    });
  }
}
function listParameters2() {
  return [
    {
      kind: "option",
      name: "--page",
      names: ["--page"],
      required: false,
      takes_value: true,
      is_flag: false,
      nargs: 1,
      type: "INTEGER",
      help: "Page number for paginated log listing"
    },
    {
      kind: "option",
      name: "--per-page",
      names: ["--per-page"],
      required: false,
      takes_value: true,
      is_flag: false,
      nargs: 1,
      type: "INTEGER",
      help: "Number of log entries per page"
    },
    {
      kind: "option",
      name: "--filter",
      names: ["--filter"],
      required: false,
      takes_value: true,
      is_flag: false,
      nargs: 1,
      type: "TEXT",
      help: "PocketBase filter expression for log entries"
    },
    {
      kind: "option",
      name: "--sort",
      names: ["--sort"],
      required: false,
      takes_value: true,
      is_flag: false,
      nargs: 1,
      type: "TEXT",
      help: "PocketBase sort expression for log entries"
    },
    {
      kind: "option",
      name: "--all",
      names: ["--all"],
      required: false,
      takes_value: false,
      is_flag: true,
      nargs: 1,
      type: "BOOLEAN",
      help: "Fetch every page and merge the result into a single payload"
    }
  ];
}
function createLogsDefinition(context) {
  return {
    name: "logs",
    path: "logs",
    kind: "group",
    summary: "Remote logs endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      {
        name: "list",
        path: "logs.list",
        kind: "command",
        summary: "List remote logs",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        parameters: listParameters2(),
        examples: ["pocketbase-cli --json logs list --per-page 50 --sort -created"],
        build: () => new Command("list").description("List remote logs").option("--page <number>", "Page number").option("--per-page <number>", "Results per page").option("--filter <filter>", "Filter expression").option("--sort <sort>", "Sort spec").option("--all", "Fetch all pages and merge them into a single result payload").action(async (options) => {
          await recordCommand(context, "logs list");
          const page = parseNumber2(context, "logs.list", "--page", options.page);
          const perPage = parseNumber2(context, "logs.list", "--per-page", options.perPage);
          await runRemoteAction(context, {
            action: "logs.list",
            successMessage: "Logs list completed",
            operation: (client) => options.all ? fetchAllPages({
              action: "logs.list",
              perPage,
              fetchPage: (currentPage, currentPerPage) => client.logsList({
                page: currentPage,
                perPage: currentPerPage,
                filterValue: options.filter,
                sort: options.sort
              })
            }) : client.logsList({
              page,
              perPage,
              filterValue: options.filter,
              sort: options.sort
            })
          });
        })
      },
      {
        name: "get",
        path: "logs.get",
        kind: "command",
        summary: "Get a single log entry",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        parameters: [
          {
            kind: "argument",
            name: "log_id",
            required: true,
            nargs: 1,
            type: "TEXT",
            help: "Log entry id to fetch"
          }
        ],
        examples: ["pocketbase-cli --json logs get LOG_ID"],
        build: () => new Command("get").description("Fetch a log entry").argument("<log_id>").action(async (logId) => {
          await recordCommand(context, `logs get ${logId}`);
          await runRemoteAction(context, {
            action: "logs.get",
            successMessage: "Log fetch completed",
            operation: (client) => client.logsGet(logId)
          });
        })
      },
      {
        name: "stats",
        path: "logs.stats",
        kind: "command",
        summary: "Fetch logs stats",
        authRequired: true,
        destructive: false,
        confirmationRequired: false,
        parameters: [
          {
            kind: "option",
            name: "--filter",
            names: ["--filter"],
            required: false,
            takes_value: true,
            is_flag: false,
            nargs: 1,
            type: "TEXT",
            help: "PocketBase filter expression for the stats query"
          }
        ],
        examples: ["pocketbase-cli --json logs stats --filter 'status >= 500'"],
        build: () => new Command("stats").description("Fetch logs stats").option("--filter <filter>", "Filter expression").action(async (options) => {
          await recordCommand(context, "logs stats");
          await runRemoteAction(context, {
            action: "logs.stats",
            successMessage: "Logs stats completed",
            operation: (client) => client.logsStats({
              filterValue: options.filter
            })
          });
        })
      }
    ],
    build: () => new Command("logs").description("Remote logs endpoints")
  };
}

// src/commands/raw.ts
function buildRawHistoryCommand(method, path, filePath, stdinJson, withAuth) {
  const parts = ["raw", method.toUpperCase(), sanitizeHistoryPath(path)];
  if (filePath === "-") {
    parts.push("--file", "-");
  } else if (stdinJson) {
    parts.push("--stdin-json");
  }
  if (withAuth) {
    parts.push("--with-auth");
  }
  return parts.join(" ");
}
function sanitizeHistoryPath(path) {
  const hashIndex = path.indexOf("#");
  const pathWithoutFragment = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = pathWithoutFragment.indexOf("?");
  const hasQuery = queryIndex >= 0;
  const basePath = hasQuery ? pathWithoutFragment.slice(0, queryIndex) : pathWithoutFragment;
  const hasFragment = hashIndex >= 0;
  return `${basePath}${hasQuery ? "?<redacted>" : ""}${hasFragment ? "#<redacted>" : ""}`;
}
function createRawDefinition(context) {
  return {
    name: "raw",
    path: "raw",
    kind: "command",
    summary: "Send a raw PocketBase HTTP request",
    authRequired: "conditional",
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json raw GET /api/health",
      `printf '{"name":"demo"}\\n' | pocketbase-cli --json raw POST /api/collections/tags/records --stdin-json --with-auth`
    ],
    notes: [
      "`raw` is anonymous by default; pass `--with-auth` to attach the saved token explicitly.",
      "The response `result` field contains the decoded response body, while `data` keeps the transport wrapper."
    ],
    inputSchema: createObjectInputSchema({
      description: "Optional JSON request body used with methods such as POST, PUT, or PATCH.",
      additionalProperties: true,
      examples: [{ name: "demo" }]
    }),
    parameters: [
      createArgumentParameter({
        name: "method",
        help: "HTTP method such as GET, POST, PATCH, PUT, or DELETE"
      }),
      createArgumentParameter({
        name: "path",
        help: "PocketBase API path beginning with `/`, for example `/api/health`"
      }),
      ...createJsonInputParameters(),
      createOptionParameter({
        name: "--with-auth",
        type: "BOOLEAN",
        help: "Attach the saved remote auth token to the request",
        isFlag: true
      })
    ],
    build: () => new Command("raw").description("Send a raw PocketBase HTTP request").argument("<method>").argument("<path>").option("--data <json>", "JSON object body").option("--file <path>", "Path to a JSON file or `-` to read the body from stdin").option("--stdin-json", "Read the JSON object body from stdin").option("--with-auth", "Attach the saved remote auth token to the request").action(async (method, path, options) => {
      await recordCommand(
        context,
        buildRawHistoryCommand(method, path, options.file, options.stdinJson, options.withAuth)
      );
      let body = null;
      try {
        body = await loadOptionalJsonObjectInput({
          data: options.data,
          filePath: options.file,
          stdinJson: options.stdinJson,
          action: "raw"
        });
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "raw",
          message: error instanceof Error ? error.message : String(error)
        });
      }
      const client = buildRemoteClient(context, {
        action: "raw",
        requireAuth: Boolean(options.withAuth)
      });
      try {
        const result = await client.raw({
          method,
          path,
          body: body ?? void 0,
          requireAuth: Boolean(options.withAuth),
          includeAuth: Boolean(options.withAuth)
        });
        emitSuccess({
          jsonOutput: context.jsonMode,
          action: "raw",
          message: "Raw request completed",
          data: sanitizeRemoteResult(result)
        });
      } catch (error) {
        if (error instanceof PocketBaseRemoteError) {
          emitError({
            jsonOutput: context.jsonMode,
            action: "raw",
            message: error.message,
            data: error.toJSON(),
            httpStatus: error.status
          });
        }
        throw error;
      }
    })
  };
}

// src/input/record-input.ts
var import_promises6 = require("fs/promises");
var import_node_os2 = require("os");
var import_node_path4 = require("path");
function expandHomePath2(filePath) {
  if (filePath === "~") {
    return (0, import_node_os2.homedir)();
  }
  if (filePath.startsWith("~/")) {
    return (0, import_node_path4.join)((0, import_node_os2.homedir)(), filePath.slice(2));
  }
  return filePath;
}
async function parseBinaryFileInputs(options) {
  const parsed = [];
  for (const item of options.binaryFiles) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex < 0) {
      throw new Error(
        `${options.action} expected \`--binary-file\` in \`<field>=<path>\` format.`
      );
    }
    const fieldNameRaw = item.slice(0, separatorIndex);
    const pathRaw = item.slice(separatorIndex + 1);
    const fieldName = fieldNameRaw.trim();
    const pathValue = pathRaw.trim();
    if (!fieldName) {
      throw new Error(
        `${options.action} expected \`--binary-file\` field name in \`<field>=<path>\` format.`
      );
    }
    if (!pathValue) {
      throw new Error(
        `${options.action} expected \`--binary-file\` path in \`<field>=<path>\` format.`
      );
    }
    const filePath = expandHomePath2(pathValue);
    let stats;
    try {
      stats = await (0, import_promises6.stat)(filePath);
    } catch {
      throw new Error(`${options.action} binary file does not exist: ${filePath}`);
    }
    if (!stats.isFile()) {
      throw new Error(`${options.action} binary upload path is not a file: ${filePath}`);
    }
    parsed.push({
      fieldName,
      filePath
    });
  }
  return parsed;
}
async function loadRecordMutationInput(options) {
  const body = await loadOptionalJsonObjectInput({
    data: options.data,
    filePath: options.filePath,
    stdinJson: options.stdinJson,
    action: options.action
  });
  const binaryFiles = await parseBinaryFileInputs({
    binaryFiles: options.binaryFiles,
    action: options.action
  });
  if (body === null && binaryFiles.length === 0) {
    throw new Error(
      `${options.action} requires JSON input (\`--data\`, \`--file\`, \`--stdin-json\`) or at least one \`--binary-file\`.`
    );
  }
  return {
    body: body ?? {},
    binaryFiles
  };
}

// src/commands/records.ts
function parseNumber3(context, action, optionName, value, minimum) {
  if (value === void 0) {
    return void 0;
  }
  try {
    return parseIntegerOptionValue(
      optionName,
      value,
      minimum === void 0 ? void 0 : { min: minimum }
    );
  } catch (error) {
    emitError({
      jsonOutput: context.jsonMode,
      action,
      message: error instanceof Error ? error.message : String(error),
      errorType: "invalid_input"
    });
  }
}
var ARGUMENT_METADATA = {
  collection: {
    help: "PocketBase collection name"
  },
  record_id: {
    help: "PocketBase record id"
  },
  identity: {
    help: "Identity value such as an email address or username"
  },
  password: {
    help: "Password or OTP password value",
    sensitive: true
  },
  email: {
    help: "Email address"
  },
  otp_id: {
    help: "OTP id returned by `records request-otp`"
  },
  token: {
    help: "Confirmation token received from PocketBase",
    sensitive: true
  },
  password_confirm: {
    help: "Password confirmation value",
    sensitive: true
  },
  new_email: {
    help: "New email address to request or confirm"
  }
};
var OPTION_METADATA = {
  "--page": {
    help: "Page number for paginated responses"
  },
  "--per-page": {
    help: "Items per page"
  },
  "--filter": {
    help: `PocketBase filter expression, e.g. 'email = "demo@example.com" && verified = true'`
  },
  "--sort": {
    help: "PocketBase sort expression, e.g. '-created,+name' (prefix: + ascending, - descending)"
  },
  "--fields": {
    help: "Comma-separated field projection"
  },
  "--expand": {
    help: "Comma-separated relation expansion list"
  },
  "--all": {
    help: "Fetch every page and merge the result into one payload"
  },
  "--first": {
    help: "Only use the first matching record"
  },
  "--identity-field": {
    help: "Explicit identity field name"
  },
  "--mfa-id": {
    help: "Existing MFA flow id to continue"
  },
  "--provider": {
    help: "OAuth2 provider name"
  },
  "--code": {
    help: "OAuth2 authorization code",
    sensitive: true
  },
  "--redirect-url": {
    help: "OAuth2 redirect URL used during authorization"
  },
  "--code-verifier": {
    help: "PKCE code verifier",
    sensitive: true
  },
  "--create-data": {
    help: "Inline JSON object for first-time OAuth2 record creation"
  },
  "--create-file": {
    help: "Path to a JSON file for first-time OAuth2 record creation"
  },
  "--no-save": {
    help: "Do not persist the returned auth token"
  },
  "--duration": {
    help: "Requested token duration in seconds"
  }
};
function argumentParameter(name) {
  const metadata = ARGUMENT_METADATA[name];
  return createArgumentParameter({
    name,
    help: metadata?.help,
    sensitive: metadata?.sensitive
  });
}
function optionParameter(options) {
  const metadata = OPTION_METADATA[options.name];
  return createOptionParameter({
    ...options,
    help: options.help ?? metadata?.help,
    choices: options.choices,
    conflictsWith: options.conflictsWith,
    sensitive: options.sensitive ?? metadata?.sensitive
  });
}
function listOptionsParameters() {
  return [
    optionParameter({ name: "--page", type: "INTEGER" }),
    optionParameter({ name: "--per-page", type: "INTEGER" }),
    optionParameter({ name: "--filter", type: "TEXT" }),
    optionParameter({ name: "--sort", type: "TEXT" }),
    optionParameter({ name: "--fields", type: "TEXT" }),
    optionParameter({ name: "--expand", type: "TEXT" }),
    optionParameter({ name: "--all", type: "BOOLEAN", isFlag: true })
  ];
}
function getOptionsParameters() {
  return [
    optionParameter({ name: "--fields", type: "TEXT" }),
    optionParameter({ name: "--expand", type: "TEXT" })
  ];
}
function findOptionsParameters() {
  return [
    optionParameter({ name: "--filter", type: "TEXT", required: true }),
    optionParameter({ name: "--first", type: "BOOLEAN", isFlag: true }),
    optionParameter({ name: "--per-page", type: "INTEGER" }),
    optionParameter({ name: "--sort", type: "TEXT" }),
    optionParameter({ name: "--fields", type: "TEXT" }),
    optionParameter({ name: "--expand", type: "TEXT" })
  ];
}
function mutationOptionsParameters() {
  return [
    ...createJsonInputParameters(),
    createOptionParameter({
      name: "--binary-file",
      type: "TEXT",
      help: "Repeatable file upload in `<field>=<path>` format",
      multiple: true
    })
  ];
}
async function loadRecordMutationInput2(action, options) {
  return loadRecordMutationInput({
    data: options.data,
    filePath: options.file,
    stdinJson: options.stdinJson,
    binaryFiles: options.binaryFile ?? [],
    action
  });
}
function buildMutationHistory(baseParts, options) {
  const historyParts = [...baseParts];
  if (options.file === "-") {
    historyParts.push("--file", "-");
  } else if (options.stdinJson) {
    historyParts.push("--stdin-json");
  } else if (options.data !== void 0) {
    historyParts.push("--data", "<json>");
  } else if (options.file) {
    historyParts.push("--file", "<path>");
  }
  (options.binaryFile ?? []).forEach(() => {
    historyParts.push("--binary-file", "<field=path>");
  });
  return historyParts.join(" ");
}
function namedRecordArguments(argumentNames, values) {
  return Object.fromEntries(
    argumentNames.map((argumentName, index) => [argumentName, values[index] ?? ""])
  );
}
function createSimpleRecordRemoteDefinition(context, options) {
  return {
    name: options.name,
    path: options.path,
    kind: "command",
    summary: options.summary,
    authRequired: options.authRequired,
    destructive: false,
    confirmationRequired: false,
    examples: options.examples,
    notes: options.notes,
    parameters: options.argumentNames.map((argumentName) => argumentParameter(argumentName)),
    build: () => {
      const command = new Command(options.name).description(options.summary);
      for (const argumentName of options.argumentNames) {
        command.argument(`<${argumentName}>`);
      }
      return command.action(async (...rawValues) => {
        const values = rawValues.slice(0, options.argumentNames.length);
        const args = namedRecordArguments(options.argumentNames, values);
        await recordCommand(
          context,
          buildPositionalRecordHistory(options.name, values, options.sensitiveValueIndexes)
        );
        await runRemoteAction(context, {
          action: options.path,
          successMessage: options.successMessage,
          requireAuth: options.authRequired,
          operation: (client) => options.operation(client, args)
        });
      });
    }
  };
}
function extractMfaPayload(result, action) {
  const payload = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
  const mfaId = payload.mfaId;
  if (result.status !== 401) {
    throw new Error(`${action} did not return an MFA challenge`);
  }
  if (typeof mfaId !== "string" || !mfaId.trim()) {
    throw new Error(`${action} MFA challenge did not include a usable mfaId`);
  }
  return { mfaId };
}
async function emitRecordAuthOrMfaResult(context, options) {
  if (options.result.status === 401) {
    let payload;
    try {
      payload = extractMfaPayload(options.result, options.action.replace(/\./gu, " "));
    } catch (error) {
      emitError({
        jsonOutput: context.jsonMode,
        action: options.action,
        message: error instanceof Error ? error.message : String(error),
        data: options.result
      });
    }
    emitSuccess({
      jsonOutput: context.jsonMode,
      action: options.action,
      message: options.mfaMessage,
      data: {
        ...sanitizeRemoteResult(options.result),
        mfaId: payload.mfaId,
        mfa_required: true,
        saved: false
      }
    });
    return;
  }
  if (options.saveAuth) {
    await saveRemoteAuthResult(context, {
      result: options.result,
      action: options.action.replace(/\./gu, " "),
      baseUrl: options.baseUrl,
      collection: options.collection
    });
  }
  emitSuccess({
    jsonOutput: context.jsonMode,
    action: options.action,
    message: options.successMessage,
    data: redactAuthResult(options.result)
  });
}
async function runRecordAuthAction(context, options) {
  const client = buildRemoteClient(context, {
    action: options.action,
    requireAuth: options.requireAuth,
    collection: options.collection
  });
  try {
    const result = await options.operation(client);
    await emitRecordAuthOrMfaResult(context, {
      action: options.action,
      result,
      successMessage: options.successMessage,
      mfaMessage: options.mfaMessage,
      baseUrl: options.baseUrl ?? client.baseUrl,
      collection: options.collection,
      saveAuth: options.saveAuth
    });
  } catch (error) {
    handleRemoteError(context, options.action, error);
  }
}
async function executeRecordAuthCommand(context, options) {
  await recordCommand(context, options.history);
  await runRecordAuthAction(context, {
    action: options.action,
    collection: options.collection,
    requireAuth: options.requireAuth,
    saveAuth: options.saveAuth,
    successMessage: options.successMessage,
    mfaMessage: options.mfaMessage,
    operation: options.operation
  });
}
function createRecordsListDefinition(context) {
  return {
    name: "list",
    path: "records.list",
    kind: "command",
    summary: "List records in a collection",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json records list users --all",
      "pocketbase-cli --json records list users --filter 'verified=true' --fields id,email"
    ],
    notes: [
      'Filter syntax: `field = "value"`, `field > 0`, `field ~ "%partial%"`, combine with `&&` / `||`. Example: `\'email = "demo@example.com" && verified = true\'`.',
      "Sort syntax: prefix field with `+` for ascending (default) or `-` for descending. Multiple fields: `'-created,+name'`."
    ],
    parameters: [
      argumentParameter("collection"),
      ...listOptionsParameters()
    ],
    build: () => new Command("list").description("List records in a collection").argument("<collection>").option("--page <number>", "Page number").option("--per-page <number>", "Results per page").option("--filter <filter>", "Filter expression").option("--sort <sort>", "Sort spec").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--all", "Fetch all pages and merge them into a single result payload").action(
      async (collection, options) => {
        await recordCommand(context, `records list ${collection}`);
        const page = parseNumber3(context, "records.list", "--page", options.page, 1);
        const perPage = parseNumber3(context, "records.list", "--per-page", options.perPage, 1);
        await runRemoteAction(context, {
          action: "records.list",
          successMessage: "Records list completed",
          operation: (client) => options.all ? fetchAllPages({
            action: "records.list",
            perPage,
            fetchPage: (currentPage, currentPerPage) => client.recordsList({
              collection,
              page: currentPage,
              perPage: currentPerPage,
              filterValue: options.filter,
              sort: options.sort,
              fields: options.fields,
              expand: options.expand
            })
          }) : client.recordsList({
            collection,
            page,
            perPage,
            filterValue: options.filter,
            sort: options.sort,
            fields: options.fields,
            expand: options.expand
          })
        });
      }
    )
  };
}
function createRecordsGetDefinition(context) {
  return {
    name: "get",
    path: "records.get",
    kind: "command",
    summary: "Fetch a single record",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json records get users RECORD_ID --expand profile"],
    parameters: [
      argumentParameter("collection"),
      argumentParameter("record_id"),
      ...getOptionsParameters()
    ],
    build: () => new Command("get").description("Fetch a single record").argument("<collection>").argument("<record_id>").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").action(
      async (collection, recordId, options) => {
        await recordCommand(context, `records get ${collection} ${recordId}`);
        await runRemoteAction(context, {
          action: "records.get",
          successMessage: "Record fetch completed",
          operation: (client) => client.recordsGet({
            collection,
            recordId,
            fields: options.fields,
            expand: options.expand
          })
        });
      }
    )
  };
}
function createRecordsFindDefinition(context) {
  return {
    name: "find",
    path: "records.find",
    kind: "command",
    summary: "Find records by PocketBase filter",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `pocketbase-cli --json records find users --filter 'email = "demo@example.com"' --first`
    ],
    parameters: [
      argumentParameter("collection"),
      ...findOptionsParameters()
    ],
    build: () => new Command("find").description("Find records by PocketBase filter").argument("<collection>").requiredOption("--filter <filter>", "PocketBase filter expression").option("--first", "Return only the first matched record").option("--per-page <number>", "Results per page").option("--sort <sort>", "Sort spec").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").action(
      async (collection, options) => {
        const historyParts = ["records", "find", collection, "--filter", options.filter];
        if (options.first) {
          historyParts.push("--first");
        }
        if (options.perPage !== void 0) {
          historyParts.push("--per-page", options.perPage);
        }
        if (options.sort) {
          historyParts.push("--sort", options.sort);
        }
        if (options.fields) {
          historyParts.push("--fields", options.fields);
        }
        if (options.expand) {
          historyParts.push("--expand", options.expand);
        }
        await recordCommand(context, historyParts.join(" "));
        try {
          const result = options.first ? await runFindFirstPage(context, {
            collection,
            filterValue: options.filter,
            sort: options.sort,
            fields: options.fields,
            expand: options.expand
          }) : await fetchAllPages({
            action: "records.find",
            perPage: parseNumber3(context, "records.find", "--per-page", options.perPage, 1),
            fetchPage: (currentPage, currentPerPage) => runFindListPage(context, {
              collection,
              page: currentPage,
              perPage: currentPerPage,
              filterValue: options.filter,
              sort: options.sort,
              fields: options.fields,
              expand: options.expand
            })
          });
          const payload = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : null;
          if (!payload || !Array.isArray(payload.items)) {
            emitError({
              jsonOutput: context.jsonMode,
              action: "records.find",
              message: "records.find expected a paginated response with an `items` array"
            });
          }
          const items = payload.items;
          emitSuccess({
            jsonOutput: context.jsonMode,
            action: "records.find",
            message: "Record filter query completed",
            data: {
              collection,
              filter: options.filter,
              matched_count: typeof payload.totalItems === "number" ? payload.totalItems : items.length,
              found: items.length > 0,
              record: items[0] ?? null,
              items,
              page_info: payload
            }
          });
        } catch (error) {
          handleRemoteError(context, "records.find", error);
        }
      }
    )
  };
}
function collectValues(value, previous = []) {
  return [...previous, value];
}
function createRecordsCreateDefinition(context) {
  return {
    name: "create",
    path: "records.create",
    kind: "command",
    summary: "Create a record",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `printf '{"email":"demo@example.com"}\\n' | pocketbase-cli --json records create users --stdin-json`,
      "pocketbase-cli --json records create users --file payload.json --binary-file avatar=./avatar.png"
    ],
    notes: [
      "Use either JSON input, one or more `--binary-file` values, or both.",
      "`--binary-file` expects `<field>=<path>` and can be repeated."
    ],
    inputSchema: createObjectInputSchema({
      description: "Record create JSON body. The exact shape depends on the target collection schema.",
      additionalProperties: true
    }),
    parameters: [
      argumentParameter("collection"),
      ...mutationOptionsParameters()
    ],
    build: () => new Command("create").description("Create a record").argument("<collection>").option("--data <json>", "JSON object body").option("--file <path>", "Path to a JSON file or `-` to read from stdin").option("--stdin-json", "Read the JSON object body from stdin").option(
      "--binary-file <field=path>",
      "Repeatable file upload in `<field>=<path>` format",
      collectValues,
      []
    ).action(async (collection, options) => {
      await recordCommand(context, buildMutationHistory(["records", "create", collection], options));
      let input;
      try {
        input = await loadRecordMutationInput2("records.create", options);
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "records.create",
          message: error instanceof Error ? error.message : String(error),
          errorType: "invalid_input"
        });
      }
      await runRemoteAction(context, {
        action: "records.create",
        successMessage: "Record create completed",
        operation: (client) => input.binaryFiles.length > 0 ? client.recordsCreateWithFiles({
          collection,
          body: input.body,
          fileFields: input.binaryFiles
        }) : client.recordsCreate({
          collection,
          body: input.body
        })
      });
    })
  };
}
function createRecordsUpdateDefinition(context) {
  return {
    name: "update",
    path: "records.update",
    kind: "command",
    summary: "Update a record",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `printf '{"name":"Updated"}\\n' | pocketbase-cli --json records update users RECORD_ID --stdin-json`
    ],
    notes: [
      "Use either JSON input, one or more `--binary-file` values, or both."
    ],
    inputSchema: createObjectInputSchema({
      description: "Record update JSON body. The exact shape depends on the target collection schema.",
      additionalProperties: true
    }),
    parameters: [
      argumentParameter("collection"),
      argumentParameter("record_id"),
      ...mutationOptionsParameters()
    ],
    build: () => new Command("update").description("Update a record").argument("<collection>").argument("<record_id>").option("--data <json>", "JSON object body").option("--file <path>", "Path to a JSON file or `-` to read from stdin").option("--stdin-json", "Read the JSON object body from stdin").option(
      "--binary-file <field=path>",
      "Repeatable file upload in `<field>=<path>` format",
      collectValues,
      []
    ).action(async (collection, recordId, options) => {
      await recordCommand(
        context,
        buildMutationHistory(["records", "update", collection, recordId], options)
      );
      let input;
      try {
        input = await loadRecordMutationInput2("records.update", options);
      } catch (error) {
        emitError({
          jsonOutput: context.jsonMode,
          action: "records.update",
          message: error instanceof Error ? error.message : String(error),
          errorType: "invalid_input"
        });
      }
      await runRemoteAction(context, {
        action: "records.update",
        successMessage: "Record update completed",
        operation: (client) => input.binaryFiles.length > 0 ? client.recordsUpdateWithFiles({
          collection,
          recordId,
          body: input.body,
          fileFields: input.binaryFiles
        }) : client.recordsUpdate({
          collection,
          recordId,
          body: input.body
        })
      });
    })
  };
}
function createRecordsUpsertDefinition(context) {
  return {
    name: "upsert",
    path: "records.upsert",
    kind: "command",
    summary: "Create or update a record matched by filter",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      `printf '{"email":"demo@example.com","name":"Demo"}\\n' | pocketbase-cli --json records upsert users --filter 'email = "demo@example.com"' --stdin-json`
    ],
    notes: [
      "The filter decides whether the request updates an existing record or creates a new one."
    ],
    inputSchema: createObjectInputSchema({
      description: "Record upsert JSON body. The exact shape depends on the target collection schema.",
      additionalProperties: true
    }),
    parameters: [
      argumentParameter("collection"),
      optionParameter({ name: "--filter", type: "TEXT", required: true }),
      ...mutationOptionsParameters(),
      optionParameter({ name: "--first", type: "BOOLEAN", isFlag: true }),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" })
    ],
    build: () => new Command("upsert").description("Create or update a record matched by filter").argument("<collection>").requiredOption("--filter <filter>", "PocketBase filter expression").option("--data <json>", "JSON object body").option("--file <path>", "Path to a JSON file or `-` to read from stdin").option("--stdin-json", "Read the JSON object body from stdin").option(
      "--binary-file <field=path>",
      "Repeatable file upload in `<field>=<path>` format",
      collectValues,
      []
    ).option("--first", "Update the first matched record when the filter matches multiple").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").action(
      async (collection, options) => {
        const historyParts = ["records", "upsert", collection, "--filter", options.filter];
        if (options.file === "-") {
          historyParts.push("--file", "-");
        } else if (options.stdinJson) {
          historyParts.push("--stdin-json");
        } else if (options.file) {
          historyParts.push("--file", options.file);
        } else if (options.data !== void 0) {
          historyParts.push("--data", "<json>");
        } else if (!options.binaryFile?.length) {
          historyParts.push("--data", "<json>");
        }
        (options.binaryFile ?? []).forEach(() => {
          historyParts.push("--binary-file", "<field=path>");
        });
        if (options.first) {
          historyParts.push("--first");
        }
        if (options.fields) {
          historyParts.push("--fields", options.fields);
        }
        if (options.expand) {
          historyParts.push("--expand", options.expand);
        }
        await recordCommand(context, historyParts.join(" "));
        let input;
        try {
          input = await loadRecordMutationInput2("records.upsert", options);
        } catch (error) {
          emitError({
            jsonOutput: context.jsonMode,
            action: "records.upsert",
            message: error instanceof Error ? error.message : String(error),
            errorType: "invalid_input"
          });
        }
        const client = buildRemoteClient(context, {
          action: "records.upsert",
          requireAuth: true
        });
        const responseProjection = {
          ...options.fields ? { fields: options.fields } : {},
          ...options.expand ? { expand: options.expand } : {}
        };
        try {
          const lookup = await client.recordsList({
            collection,
            page: 1,
            perPage: 2,
            filterValue: options.filter,
            sort: void 0,
            fields: "id",
            expand: void 0
          });
          const payload = lookup.data && typeof lookup.data === "object" && !Array.isArray(lookup.data) ? lookup.data : null;
          const matchedItems = Array.isArray(payload?.items) ? payload.items : [];
          const matchedCount = typeof payload?.totalItems === "number" ? payload.totalItems : matchedItems.length;
          let result;
          let operation;
          if (matchedCount === 0) {
            result = input.binaryFiles.length > 0 ? await client.recordsCreateWithFiles({
              collection,
              body: input.body,
              fileFields: input.binaryFiles,
              ...responseProjection
            }) : await client.recordsCreate({
              collection,
              body: input.body,
              ...responseProjection
            });
            operation = "create";
          } else {
            if (matchedCount !== 1 && !options.first) {
              emitError({
                jsonOutput: context.jsonMode,
                action: "records.upsert",
                message: `Filter matched ${matchedCount} records. Narrow the filter or pass \`--first\` to update the first match.`,
                errorType: "invalid_input",
                hint: "Use `records find <collection> --filter ...` to inspect matches before upsert.",
                data: {
                  collection,
                  filter: options.filter,
                  matched_count: matchedCount
                }
              });
            }
            const target = matchedItems[0] && typeof matchedItems[0] === "object" && !Array.isArray(matchedItems[0]) ? matchedItems[0] : null;
            const targetId = target?.id;
            if (typeof targetId !== "string" || !targetId) {
              emitError({
                jsonOutput: context.jsonMode,
                action: "records.upsert",
                message: "Matched record did not include a usable `id`."
              });
            }
            result = input.binaryFiles.length > 0 ? await client.recordsUpdateWithFiles({
              collection,
              recordId: targetId,
              body: input.body,
              fileFields: input.binaryFiles,
              ...responseProjection
            }) : await client.recordsUpdate({
              collection,
              recordId: targetId,
              body: input.body,
              ...responseProjection
            });
            operation = "update";
          }
          const data = sanitizeRemoteValue({
            collection,
            filter: options.filter,
            matched_count: matchedCount,
            operation,
            data: result.data,
            method: result.method,
            url: result.url,
            status: result.status
          });
          emitSuccess({
            jsonOutput: context.jsonMode,
            action: "records.upsert",
            message: "Record upsert completed",
            data
          });
        } catch (error) {
          handleRemoteError(context, "records.upsert", error);
        }
      }
    )
  };
}
function createRecordsDeleteByFilterDefinition(context) {
  return {
    name: "delete-by-filter",
    path: "records.delete-by-filter",
    kind: "command",
    summary: "Delete records matched by filter",
    authRequired: true,
    destructive: true,
    ...CONFIRMED_COMMAND_METADATA,
    examples: [
      "pocketbase-cli --json records delete-by-filter users --filter 'verified=false' --yes",
      `pocketbase-cli --json records delete-by-filter users --filter 'created < "2024-01-01"' --expect-count 5 --yes`
    ],
    parameters: [
      {
        kind: "argument",
        name: "collection",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "PocketBase collection name"
      },
      {
        kind: "option",
        name: "--filter",
        names: ["--filter"],
        required: true,
        takes_value: true,
        is_flag: false,
        nargs: 1,
        type: "TEXT",
        help: "PocketBase filter expression"
      },
      {
        kind: "option",
        name: "--expect-count",
        names: ["--expect-count"],
        required: false,
        takes_value: true,
        is_flag: false,
        nargs: 1,
        type: "INTEGER",
        help: "Fail unless the filter matches exactly this many records"
      },
      createConfirmationParameter("Acknowledge that filtered deletion is destructive")
    ],
    build: () => {
      const command = new Command("delete-by-filter").description("Delete records matched by filter").argument("<collection>").requiredOption("--filter <filter>", "PocketBase filter expression").option("--expect-count <number>", "Fail unless the filter matches exactly this many records");
      return addConfirmationOption(
        command,
        "Acknowledge that filtered deletion is destructive"
      ).action(
        async (collection, options) => {
          requireConfirmedCommand(context, {
            action: "records.delete-by-filter",
            yes: options.yes,
            message: "Filtered record deletion is destructive. Re-run with `--yes` to continue.",
            hint: "Re-run `records delete-by-filter <collection> --filter ... --yes` after verifying the matched set."
          });
          const historyParts = [
            "records",
            "delete-by-filter",
            collection,
            "--filter",
            options.filter,
            "--yes"
          ];
          if (options.expectCount !== void 0) {
            historyParts.push("--expect-count", options.expectCount);
          }
          await recordCommand(context, historyParts.join(" "));
          const expectCount = parseNumber3(
            context,
            "records.delete-by-filter",
            "--expect-count",
            options.expectCount,
            0
          );
          const client = buildRemoteClient(context, {
            action: "records.delete-by-filter",
            requireAuth: true
          });
          try {
            const lookup = await fetchAllPages({
              action: "records.delete-by-filter",
              perPage: null,
              fetchPage: (currentPage, currentPerPage) => client.recordsList({
                collection,
                page: currentPage,
                perPage: currentPerPage,
                filterValue: options.filter,
                sort: void 0,
                fields: "id",
                expand: void 0
              })
            });
            const payload = lookup.data && typeof lookup.data === "object" && !Array.isArray(lookup.data) ? lookup.data : null;
            const items = Array.isArray(payload?.items) ? payload.items : [];
            const matchedCount = items.length;
            if (expectCount !== void 0 && matchedCount !== expectCount) {
              emitError({
                jsonOutput: context.jsonMode,
                action: "records.delete-by-filter",
                message: `Expected ${expectCount} records but matched ${matchedCount}.`,
                errorType: "invalid_input",
                hint: "Use `records find <collection> --filter ...` to inspect the matched records first.",
                data: {
                  collection,
                  filter: options.filter,
                  matched_count: matchedCount,
                  expected_count: expectCount
                }
              });
            }
            const deletedIds = [];
            for (const item of items) {
              const recordId = item && typeof item === "object" && !Array.isArray(item) ? item.id : null;
              if (typeof recordId !== "string" || !recordId) {
                continue;
              }
              await client.recordsDelete({
                collection,
                recordId
              });
              deletedIds.push(recordId);
            }
            emitSuccess({
              jsonOutput: context.jsonMode,
              action: "records.delete-by-filter",
              message: "Filtered record delete completed",
              data: {
                collection,
                filter: options.filter,
                matched_count: matchedCount,
                deleted_count: deletedIds.length,
                deleted_ids: deletedIds
              }
            });
          } catch (error) {
            handleRemoteError(context, "records.delete-by-filter", error);
          }
        }
      );
    }
  };
}
async function runFindFirstPage(context, options) {
  const client = createFindClient(context);
  return client.recordsList({
    collection: options.collection,
    page: 1,
    perPage: 1,
    filterValue: options.filterValue,
    sort: options.sort,
    fields: options.fields,
    expand: options.expand
  });
}
async function runFindListPage(context, options) {
  const client = createFindClient(context);
  return client.recordsList({
    collection: options.collection,
    page: options.page,
    perPage: options.perPage,
    filterValue: options.filterValue,
    sort: options.sort,
    fields: options.fields,
    expand: options.expand
  });
}
function createFindClient(context) {
  return buildRemoteClient(context, {
    action: "records.find",
    requireAuth: true
  });
}
function createRecordsDeleteDefinition(context) {
  return {
    name: "delete",
    path: "records.delete",
    kind: "command",
    summary: "Delete a record",
    authRequired: true,
    destructive: true,
    ...CONFIRMED_COMMAND_METADATA,
    examples: ["pocketbase-cli --json records delete users RECORD_ID --yes"],
    parameters: [
      {
        kind: "argument",
        name: "collection",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "PocketBase collection name"
      },
      {
        kind: "argument",
        name: "record_id",
        required: true,
        nargs: 1,
        type: "TEXT",
        help: "PocketBase record id"
      },
      createConfirmationParameter("Acknowledge that deleting a record is destructive")
    ],
    build: () => {
      const command = new Command("delete").description("Delete a record").argument("<collection>").argument("<record_id>");
      return addConfirmationOption(
        command,
        "Acknowledge that deleting a record is destructive"
      ).action(async (collection, recordId, options) => {
        requireConfirmedCommand(context, {
          action: "records.delete",
          yes: options.yes,
          message: "Record delete is destructive. Re-run with `--yes` to continue.",
          hint: "Re-run `records delete <collection> <record_id> --yes` after confirming the record id."
        });
        await recordCommand(context, `records delete ${collection} ${recordId} --yes`);
        await runRemoteAction(context, {
          action: "records.delete",
          successMessage: "Record delete completed",
          operation: (client) => client.recordsDelete({
            collection,
            recordId
          })
        });
      });
    }
  };
}
function createRecordsAuthMethodsDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "auth-methods",
    path: "records.auth-methods",
    summary: "Fetch record auth methods for a collection",
    authRequired: false,
    argumentNames: ["collection"],
    successMessage: "Record auth methods fetch completed",
    examples: ["pocketbase-cli --json records auth-methods users"],
    operation: (client, args) => client.recordAuthMethods(args.collection)
  });
}
function createRecordsAuthPasswordDefinition(context) {
  return {
    name: "auth-password",
    path: "records.auth-password",
    kind: "command",
    summary: "Authenticate a record with password",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json records auth-password users demo@example.com Secret123 --fields id,email"
    ],
    notes: [
      "Use `--no-save` when the returned token should not overwrite the saved auth session.",
      "If MFA is enabled, the first call returns `mfa_required: true` with an `mfaId`. Re-run with `--mfa-id <mfaId>` to complete authentication."
    ],
    parameters: [
      argumentParameter("collection"),
      argumentParameter("identity"),
      argumentParameter("password"),
      optionParameter({ name: "--identity-field", type: "TEXT" }),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" }),
      optionParameter({ name: "--mfa-id", type: "TEXT" }),
      optionParameter({ name: "--no-save", type: "BOOLEAN", isFlag: true })
    ],
    build: () => new Command("auth-password").description("Authenticate a record with password").argument("<collection>").argument("<identity>").argument("<password>").option("--identity-field <field>", "Explicit identity field").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--mfa-id <mfa_id>", "Continue an existing MFA flow").option("--no-save", "Do not persist the returned auth token").action(
      async (collection, identity, password, options) => {
        await executeRecordAuthCommand(context, {
          history: buildRecordHistory(["records", "auth-password", collection], [
            { kind: "option", flag: "--identity-field", value: options.identityField },
            { kind: "option", flag: "--fields", value: options.fields },
            { kind: "option", flag: "--expand", value: options.expand },
            { kind: "option", flag: "--mfa-id", value: options.mfaId },
            { kind: "flag", flag: "--no-save", include: options.save === false },
            { kind: "value", value: identity },
            { kind: "value", value: password, sensitive: true }
          ]),
          action: "records.auth-password",
          collection,
          requireAuth: false,
          saveAuth: options.save !== false,
          successMessage: "Record password auth completed",
          mfaMessage: "Record password auth requires MFA confirmation",
          operation: (client) => client.recordAuthPassword({
            collection,
            identity,
            password,
            identityField: options.identityField,
            fields: options.fields,
            expand: options.expand,
            mfaId: options.mfaId
          })
        });
      }
    )
  };
}
function createRecordsAuthOauth2Definition(context) {
  return {
    name: "auth-oauth2",
    path: "records.auth-oauth2",
    kind: "command",
    summary: "Authenticate a record with OAuth2",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json records auth-oauth2 users --provider google --code AUTH_CODE --redirect-url https://app.example.com/callback"
    ],
    notes: [
      "Use either `--create-data` or `--create-file` to provide first-time record creation payload."
    ],
    parameters: [
      argumentParameter("collection"),
      optionParameter({ name: "--provider", type: "TEXT", required: true }),
      optionParameter({ name: "--code", type: "TEXT", required: true }),
      optionParameter({ name: "--redirect-url", type: "TEXT", required: true }),
      optionParameter({ name: "--code-verifier", type: "TEXT" }),
      optionParameter({
        name: "--create-data",
        type: "TEXT",
        conflictsWith: ["--create-file"]
      }),
      optionParameter({
        name: "--create-file",
        type: "TEXT",
        conflictsWith: ["--create-data"]
      }),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" }),
      optionParameter({ name: "--no-save", type: "BOOLEAN", isFlag: true })
    ],
    build: () => new Command("auth-oauth2").description("Authenticate a record with OAuth2").argument("<collection>").requiredOption("--provider <provider>", "OAuth2 provider name").requiredOption("--code <code>", "OAuth2 authorization code").requiredOption("--redirect-url <url>", "OAuth2 redirect URL").option("--code-verifier <verifier>", "Optional PKCE code verifier").option("--create-data <json>", "Optional JSON object for first-time record creation").option("--create-file <path>", "Path to a JSON file for first-time record creation").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--no-save", "Do not persist the returned auth token").action(
      async (collection, options) => {
        let createPayload;
        try {
          createPayload = await loadOptionalJsonObjectInput({
            data: options.createData,
            filePath: options.createFile,
            stdinJson: false,
            action: "records.auth-oauth2"
          });
        } catch (error) {
          emitError({
            jsonOutput: context.jsonMode,
            action: "records.auth-oauth2",
            message: error instanceof Error ? error.message : String(error),
            errorType: "invalid_input"
          });
        }
        await executeRecordAuthCommand(context, {
          history: buildRecordHistory(["records", "auth-oauth2", collection], [
            { kind: "option", flag: "--provider", value: options.provider },
            {
              kind: "option",
              flag: "--code",
              value: options.code,
              renderValue: "********"
            },
            { kind: "option", flag: "--redirect-url", value: options.redirectUrl },
            {
              kind: "option",
              flag: "--code-verifier",
              value: options.codeVerifier,
              renderValue: "********"
            },
            {
              kind: "option",
              flag: "--create-data",
              value: options.createData,
              renderValue: "<json>"
            },
            { kind: "option", flag: "--create-file", value: options.createFile },
            { kind: "option", flag: "--fields", value: options.fields },
            { kind: "option", flag: "--expand", value: options.expand },
            { kind: "flag", flag: "--no-save", include: options.save === false }
          ]),
          action: "records.auth-oauth2",
          collection,
          requireAuth: false,
          saveAuth: options.save !== false,
          successMessage: "Record OAuth2 auth completed",
          mfaMessage: "Record OAuth2 auth requires MFA confirmation",
          operation: (client) => client.recordAuthOauth2({
            collection,
            provider: options.provider,
            code: options.code,
            redirectUrl: options.redirectUrl,
            codeVerifier: options.codeVerifier,
            createData: createPayload,
            fields: options.fields,
            expand: options.expand
          })
        });
      }
    )
  };
}
function createRecordsAuthRefreshDefinition(context) {
  return {
    name: "auth-refresh",
    path: "records.auth-refresh",
    kind: "command",
    summary: "Refresh record auth token",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json records auth-refresh users --fields id,email"],
    parameters: [
      argumentParameter("collection"),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" }),
      optionParameter({ name: "--no-save", type: "BOOLEAN", isFlag: true })
    ],
    build: () => new Command("auth-refresh").description("Refresh record auth token").argument("<collection>").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--no-save", "Do not persist the refreshed auth token").action(
      async (collection, options) => {
        await executeRecordAuthCommand(context, {
          history: buildRecordHistory(["records", "auth-refresh", collection], [
            { kind: "option", flag: "--fields", value: options.fields },
            { kind: "option", flag: "--expand", value: options.expand },
            { kind: "flag", flag: "--no-save", include: options.save === false }
          ]),
          action: "records.auth-refresh",
          collection,
          requireAuth: true,
          saveAuth: options.save !== false,
          successMessage: "Record auth refresh completed",
          mfaMessage: "Record auth refresh requires MFA confirmation",
          operation: (client) => client.recordAuthRefresh({
            collection,
            fields: options.fields,
            expand: options.expand
          })
        });
      }
    )
  };
}
function createRecordsRequestOtpDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "request-otp",
    path: "records.request-otp",
    summary: "Request a record OTP",
    authRequired: false,
    argumentNames: ["collection", "email"],
    successMessage: "Record OTP request completed",
    examples: ["pocketbase-cli --json records request-otp users demo@example.com"],
    notes: ["Returns an `otpId` needed by `records auth-otp` to complete authentication."],
    operation: (client, args) => client.recordRequestOtp({
      collection: args.collection,
      email: args.email
    })
  });
}
function createRecordsAuthOtpDefinition(context) {
  return {
    name: "auth-otp",
    path: "records.auth-otp",
    kind: "command",
    summary: "Authenticate a record with OTP",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json records auth-otp users OTP_ID 123456"
    ],
    notes: [
      "The `otp_id` is returned by `records request-otp`. Two-step flow: first call `records request-otp <collection> <email>`, then use the returned `otpId` here."
    ],
    parameters: [
      argumentParameter("collection"),
      argumentParameter("otp_id"),
      argumentParameter("password"),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" }),
      optionParameter({ name: "--mfa-id", type: "TEXT" }),
      optionParameter({ name: "--no-save", type: "BOOLEAN", isFlag: true })
    ],
    build: () => new Command("auth-otp").description("Authenticate a record with OTP").argument("<collection>").argument("<otp_id>").argument("<password>").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--mfa-id <mfa_id>", "Continue an existing MFA flow").option("--no-save", "Do not persist the returned auth token").action(
      async (collection, otpId, password, options) => {
        await executeRecordAuthCommand(context, {
          history: buildRecordHistory(["records", "auth-otp", collection], [
            { kind: "option", flag: "--fields", value: options.fields },
            { kind: "option", flag: "--expand", value: options.expand },
            { kind: "option", flag: "--mfa-id", value: options.mfaId },
            { kind: "flag", flag: "--no-save", include: options.save === false },
            { kind: "value", value: otpId },
            { kind: "value", value: password, sensitive: true }
          ]),
          action: "records.auth-otp",
          collection,
          requireAuth: false,
          saveAuth: options.save !== false,
          successMessage: "Record OTP auth completed",
          mfaMessage: "Record OTP auth requires MFA confirmation",
          operation: (client) => client.recordAuthOtp({
            collection,
            otpId,
            password,
            fields: options.fields,
            expand: options.expand,
            mfaId: options.mfaId
          })
        });
      }
    )
  };
}
function createRecordsRequestPasswordResetDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "request-password-reset",
    path: "records.request-password-reset",
    summary: "Request a record password reset",
    authRequired: false,
    argumentNames: ["collection", "email"],
    successMessage: "Record password reset request completed",
    examples: ["pocketbase-cli --json records request-password-reset users demo@example.com"],
    notes: ["Sends a password reset email. Use the token from the email with `records confirm-password-reset`."],
    operation: (client, args) => client.recordRequestPasswordReset({
      collection: args.collection,
      email: args.email
    })
  });
}
function createRecordsConfirmPasswordResetDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "confirm-password-reset",
    path: "records.confirm-password-reset",
    summary: "Confirm a record password reset",
    authRequired: false,
    argumentNames: ["collection", "token", "password", "password_confirm"],
    sensitiveValueIndexes: [1, 2, 3],
    successMessage: "Record password reset confirmation completed",
    examples: ["pocketbase-cli --json records confirm-password-reset users TOKEN NewPass123 NewPass123"],
    operation: (client, args) => client.recordConfirmPasswordReset({
      collection: args.collection,
      token: args.token,
      password: args.password,
      passwordConfirm: args.password_confirm
    })
  });
}
function createRecordsRequestVerificationDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "request-verification",
    path: "records.request-verification",
    summary: "Request record verification",
    authRequired: false,
    argumentNames: ["collection", "email"],
    successMessage: "Record verification request completed",
    examples: ["pocketbase-cli --json records request-verification users demo@example.com"],
    notes: ["Sends a verification email. Use the token from the email with `records confirm-verification`."],
    operation: (client, args) => client.recordRequestVerification({
      collection: args.collection,
      email: args.email
    })
  });
}
function createRecordsConfirmVerificationDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "confirm-verification",
    path: "records.confirm-verification",
    summary: "Confirm record verification",
    authRequired: false,
    argumentNames: ["collection", "token"],
    sensitiveValueIndexes: [1],
    successMessage: "Record verification confirmation completed",
    examples: ["pocketbase-cli --json records confirm-verification users TOKEN"],
    operation: (client, args) => client.recordConfirmVerification({
      collection: args.collection,
      token: args.token
    })
  });
}
function createRecordsRequestEmailChangeDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "request-email-change",
    path: "records.request-email-change",
    summary: "Request record email change",
    authRequired: true,
    argumentNames: ["collection", "new_email"],
    successMessage: "Record email change request completed",
    examples: ["pocketbase-cli --json records request-email-change users new@example.com"],
    notes: ["Sends a confirmation email to the new address. Use the token from the email with `records confirm-email-change`."],
    operation: (client, args) => client.recordRequestEmailChange({
      collection: args.collection,
      newEmail: args.new_email
    })
  });
}
function createRecordsConfirmEmailChangeDefinition(context) {
  return createSimpleRecordRemoteDefinition(context, {
    name: "confirm-email-change",
    path: "records.confirm-email-change",
    summary: "Confirm record email change",
    authRequired: false,
    argumentNames: ["collection", "token", "password"],
    sensitiveValueIndexes: [1, 2],
    successMessage: "Record email change confirmation completed",
    examples: ["pocketbase-cli --json records confirm-email-change users TOKEN CurrentPass123"],
    operation: (client, args) => client.recordConfirmEmailChange({
      collection: args.collection,
      token: args.token,
      password: args.password
    })
  });
}
function createRecordsImpersonateDefinition(context) {
  return {
    name: "impersonate",
    path: "records.impersonate",
    kind: "command",
    summary: "Impersonate a record auth session",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli --json records impersonate users RECORD_ID --duration 300"
    ],
    parameters: [
      argumentParameter("collection"),
      argumentParameter("record_id"),
      optionParameter({ name: "--duration", type: "INTEGER" }),
      optionParameter({ name: "--fields", type: "TEXT" }),
      optionParameter({ name: "--expand", type: "TEXT" }),
      optionParameter({ name: "--no-save", type: "BOOLEAN", isFlag: true })
    ],
    build: () => new Command("impersonate").description("Impersonate a record auth session").argument("<collection>").argument("<record_id>").option("--duration <seconds>", "Optional auth token duration in seconds").option("--fields <fields>", "Fields projection").option("--expand <expand>", "Expand relation fields").option("--no-save", "Do not persist the impersonation token").action(
      async (collection, recordId, options) => {
        await executeRecordAuthCommand(context, {
          history: buildRecordHistory(["records", "impersonate", collection, recordId], [
            { kind: "option", flag: "--duration", value: options.duration },
            { kind: "option", flag: "--fields", value: options.fields },
            { kind: "option", flag: "--expand", value: options.expand },
            { kind: "flag", flag: "--no-save", include: options.save === false }
          ]),
          action: "records.impersonate",
          collection,
          requireAuth: true,
          saveAuth: options.save !== false,
          successMessage: "Record impersonation completed",
          mfaMessage: "Record impersonation requires MFA confirmation",
          operation: (client) => client.recordImpersonate({
            collection,
            recordId,
            duration: parseNumber3(
              context,
              "records.impersonate",
              "--duration",
              options.duration,
              1
            ),
            fields: options.fields,
            expand: options.expand
          })
        });
      }
    )
  };
}
function createRecordsDefinition(context) {
  return {
    name: "records",
    path: "records",
    kind: "group",
    summary: "Remote records endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      createRecordsAuthMethodsDefinition(context),
      createRecordsAuthPasswordDefinition(context),
      createRecordsAuthOauth2Definition(context),
      createRecordsAuthRefreshDefinition(context),
      createRecordsRequestOtpDefinition(context),
      createRecordsAuthOtpDefinition(context),
      createRecordsRequestPasswordResetDefinition(context),
      createRecordsConfirmPasswordResetDefinition(context),
      createRecordsRequestVerificationDefinition(context),
      createRecordsConfirmVerificationDefinition(context),
      createRecordsRequestEmailChangeDefinition(context),
      createRecordsConfirmEmailChangeDefinition(context),
      createRecordsImpersonateDefinition(context),
      createRecordsListDefinition(context),
      createRecordsGetDefinition(context),
      createRecordsCreateDefinition(context),
      createRecordsUpdateDefinition(context),
      createRecordsFindDefinition(context),
      createRecordsUpsertDefinition(context),
      createRecordsDeleteByFilterDefinition(context),
      createRecordsDeleteDefinition(context)
    ],
    build: () => new Command("records").description("Remote records endpoints")
  };
}

// src/commands/repl.ts
function createReplDefinition(_context, runRepl) {
  return {
    name: "repl",
    path: "repl",
    kind: "command",
    summary: "Start interactive REPL mode explicitly",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli repl"],
    build: () => new Command("repl").description("Start interactive REPL mode explicitly").action(async () => {
      await runRepl();
    })
  };
}

// src/contract/command-registry.ts
function normalizeSchemaPath(path) {
  return path.trim().replace(/\./gu, " ").replace(/\s+/gu, " ").toLowerCase();
}
function flattenCommandDefinitions(definitions, includeHidden = false) {
  const result = [];
  const stack = definitions.slice().reverse();
  while (stack.length > 0) {
    const definition = stack.pop();
    if (!definition) {
      continue;
    }
    if (definition.hidden && !includeHidden) {
      continue;
    }
    result.push(definition);
    if (definition.children?.length) {
      for (let index = definition.children.length - 1; index >= 0; index -= 1) {
        stack.push(definition.children[index]);
      }
    }
  }
  return result;
}
function registerCommandDefinitions(parent, definitions) {
  for (const definition of definitions) {
    const command = definition.build?.() ?? new Command(definition.name).description(definition.summary);
    if (definition.children?.length) {
      registerCommandDefinitions(command, definition.children);
    }
    if (definition.hidden) {
      command._hidden = true;
    }
    parent.addCommand(command);
  }
}

// src/contract/schema.ts
var CONTRACT_SCHEMA_VERSION = "1.1.0";
function childPaths(definition, includeHidden) {
  const result = [];
  for (const child of definition.children ?? []) {
    if (!includeHidden && child.hidden) {
      continue;
    }
    result.push(child.path);
  }
  return result;
}
function formatDefinitionEntry(definition, includeHidden) {
  const parameters = [];
  const argumentsList = [];
  const optionsList = [];
  for (const parameter of definition.parameters ?? []) {
    parameters.push(parameter);
    if (parameter.kind === "argument") {
      argumentsList.push(parameter);
      continue;
    }
    if (parameter.kind === "option") {
      optionsList.push(parameter);
    }
  }
  return {
    name: definition.name,
    path: definition.path,
    kind: definition.kind,
    summary: definition.summary,
    hidden: Boolean(definition.hidden),
    auth_required: definition.authRequired,
    destructive: definition.destructive,
    confirmation_required: definition.confirmationRequired,
    confirmation_flag: definition.confirmationFlag ?? null,
    examples: [...definition.examples ?? []],
    notes: [...definition.notes ?? []],
    input_schema: definition.inputSchema ?? null,
    parameters,
    arguments: argumentsList,
    options: optionsList,
    children: childPaths(definition, includeHidden)
  };
}
function buildSchemaContract(definitions, includeHidden = false) {
  const filtered = includeHidden ? flattenCommandDefinitions(definitions, true) : flattenCommandDefinitions(definitions, false);
  const rootChildren = [];
  for (const definition of definitions) {
    if (!includeHidden && definition.hidden) {
      continue;
    }
    rootChildren.push(definition.path);
  }
  const root = {
    name: "root",
    path: "root",
    kind: "root",
    summary: "Remote-only PocketBase CLI root command",
    hidden: false,
    auth_required: "varies",
    destructive: false,
    confirmation_required: false,
    confirmation_flag: null,
    examples: ["pocketbase-cli --json info", "pocketbase-cli schema --json"],
    notes: [
      "Use `schema --json` for machine-readable command discovery.",
      "Command entries can include parameter help, enums, input_schema, and examples."
    ],
    input_schema: null,
    parameters: [],
    arguments: [],
    options: [],
    children: rootChildren
  };
  const commands = filtered.slice().sort((left, right) => left.path.localeCompare(right.path)).map((definition) => formatDefinitionEntry(definition, includeHidden));
  return {
    schema_version: CONTRACT_SCHEMA_VERSION,
    tool: "pocketbase-cli",
    mode: "remote-only",
    global_options: [
      {
        name: "--json",
        summary: "Emit machine-readable JSON output for command result payloads."
      }
    ],
    query_format: "schema <command path> --json",
    root,
    commands,
    entries: [root, ...commands]
  };
}

// src/commands/schema.ts
function createSchemaDefinition(context, definitionsProvider) {
  const cache = /* @__PURE__ */ new Map();
  function getSchemaView(includeHidden) {
    const cached = cache.get(includeHidden);
    if (cached) {
      return cached;
    }
    const definitions = definitionsProvider();
    const contract = buildSchemaContract(definitions, includeHidden);
    const entries = contract.entries;
    const entriesByPath = /* @__PURE__ */ new Map();
    const knownPaths = [];
    for (const entry of entries) {
      const normalized = normalizeSchemaPath(entry.path);
      entriesByPath.set(normalized, entry);
      if (entry.path !== "root") {
        knownPaths.push({
          path: entry.path,
          normalized
        });
      }
    }
    const view = {
      contract,
      knownPaths,
      entriesByPath
    };
    cache.set(includeHidden, view);
    return view;
  }
  return {
    name: "schema",
    path: "schema",
    kind: "command",
    summary: "Show machine-readable command schema for tools and LLM agents",
    authRequired: false,
    destructive: false,
    confirmationRequired: false,
    examples: [
      "pocketbase-cli schema --json",
      "pocketbase-cli schema records list --json"
    ],
    parameters: [
      {
        kind: "argument",
        name: "command_path",
        required: false,
        nargs: -1,
        type: "TEXT",
        help: "Optional command path to inspect, such as records list or records.list"
      },
      {
        kind: "option",
        name: "--json",
        names: ["--json"],
        required: false,
        takes_value: false,
        is_flag: true,
        nargs: 1,
        type: "BOOLEAN",
        help: "Emit schema payload as JSON for tool and LLM usage"
      },
      {
        kind: "option",
        name: "--include-hidden",
        names: ["--include-hidden"],
        required: false,
        takes_value: false,
        is_flag: true,
        nargs: 1,
        type: "BOOLEAN",
        help: "Include hidden compatibility commands in schema output"
      }
    ],
    build: () => new Command("schema").description("Show machine-readable command schema for tools and LLM agents").argument("[command_path...]").option("--json", "Emit schema payload as JSON for tool/LLM usage").option("--include-hidden", "Include hidden compatibility commands in schema output").action((commandPath, options) => {
      const includeHidden = options.includeHidden ?? false;
      const jsonOutput = options.json ?? context.jsonMode;
      const { contract, entriesByPath, knownPaths } = getSchemaView(includeHidden);
      const normalizedPath = (commandPath ?? []).join(" ");
      const query = normalizeSchemaPath(normalizedPath);
      if (!commandPath || commandPath.length === 0) {
        emitSuccess({
          jsonOutput,
          action: "schema",
          message: "Command schema contract",
          data: contract
        });
        return;
      }
      const entry = entriesByPath.get(query) ?? null;
      if (!entry) {
        const suggestions = [];
        for (const candidate of knownPaths) {
          if (!candidate.normalized.startsWith(query)) {
            continue;
          }
          suggestions.push(candidate.path);
          if (suggestions.length >= 20) {
            break;
          }
        }
        emitError({
          jsonOutput,
          action: "schema",
          message: `Unknown command path: ${normalizedPath}`,
          data: {
            requested_path: normalizedPath,
            normalized_path: query,
            suggestions: suggestions.slice(0, 20)
          }
        });
      }
      emitSuccess({
        jsonOutput,
        action: "schema",
        message: "Command schema",
        data: entry
      });
    })
  };
}

// src/commands/settings.ts
function validateS3TestBody(body) {
  const filesystem = body.filesystem;
  if (filesystem !== "storage" && filesystem !== "backups") {
    throw new Error("Settings S3 test payload must include `filesystem` set to `storage` or `backups`");
  }
  return body;
}
function validateEmailTestBody(body) {
  const email = body.email;
  const template = body.template;
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Settings email test payload must include a non-empty `email`");
  }
  if (typeof template !== "string" || !template.trim()) {
    throw new Error("Settings email test payload must include a non-empty `template`");
  }
  return body;
}
function validateAppleSecretBody(body) {
  const required = ["clientId", "teamId", "keyId", "privateKey", "duration"];
  const missing = required.filter((key) => !(key in body));
  if (missing.length > 0) {
    throw new Error(
      `Apple client secret payload is missing required keys: ${missing.sort().join(", ")}`
    );
  }
  return body;
}
function createSettingsGetDefinition(context) {
  return {
    name: "get",
    path: "settings.get",
    kind: "command",
    summary: "Fetch remote settings",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    examples: ["pocketbase-cli --json settings get"],
    build: () => new Command("get").description("Fetch remote settings").action(async () => {
      await recordCommand(context, "settings get");
      await runRemoteAction(context, {
        action: "settings.get",
        successMessage: "Settings fetch completed",
        operation: (client) => client.settingsGet()
      });
    })
  };
}
function createSettingsDefinition(context) {
  return {
    name: "settings",
    path: "settings",
    kind: "group",
    summary: "Remote settings endpoints",
    authRequired: true,
    destructive: false,
    confirmationRequired: false,
    children: [
      createSettingsGetDefinition(context),
      createJsonRemoteCommand({
        context,
        name: "patch",
        path: "settings.patch",
        summary: "Patch remote settings",
        successMessage: "Settings patch completed",
        historyCommand: "settings patch",
        examples: [
          `printf '{"meta":{"appName":"PocketBase"}}\\n' | pocketbase-cli --json settings patch --stdin-json`
        ],
        notes: ["The request body is forwarded to PocketBase settings patch as-is."],
        inputSchema: createObjectInputSchema({
          description: "Partial PocketBase settings object.",
          additionalProperties: true
        }),
        run: (client, body) => client.settingsPatch({ body })
      }),
      createJsonRemoteCommand({
        context,
        name: "test-s3",
        path: "settings.test-s3",
        summary: "Test remote S3 settings",
        successMessage: "Settings S3 test completed",
        historyCommand: "settings test-s3",
        examples: [
          `printf '{"filesystem":"storage"}\\n' | pocketbase-cli --json settings test-s3 --stdin-json`
        ],
        inputSchema: createObjectInputSchema({
          description: "S3 test payload.",
          properties: {
            filesystem: {
              type: "string",
              enum: ["storage", "backups"],
              description: "Which PocketBase filesystem to test."
            }
          },
          required: ["filesystem"],
          additionalProperties: true
        }),
        validateBody: validateS3TestBody,
        run: (client, body) => client.settingsTestS3({ body })
      }),
      createJsonRemoteCommand({
        context,
        name: "test-email",
        path: "settings.test-email",
        summary: "Test remote email settings",
        successMessage: "Settings email test completed",
        historyCommand: "settings test-email",
        examples: [
          `printf '{"email":"ops@example.com","template":"verification"}\\n' | pocketbase-cli --json settings test-email --stdin-json`
        ],
        inputSchema: createObjectInputSchema({
          description: "Email test payload.",
          properties: {
            email: {
              type: "string",
              description: "Recipient email address used for the test send."
            },
            template: {
              type: "string",
              description: "PocketBase email template name to render."
            }
          },
          required: ["email", "template"],
          additionalProperties: true
        }),
        validateBody: validateEmailTestBody,
        run: (client, body) => client.settingsTestEmail({ body })
      }),
      createJsonRemoteCommand({
        context,
        name: "apple-client-secret",
        path: "settings.apple-client-secret",
        summary: "Generate Apple client secret",
        successMessage: "Apple client secret generated",
        historyCommand: "settings apple-client-secret",
        examples: [
          `printf '{"clientId":"app.example","teamId":"TEAM123","keyId":"KEY123","privateKey":"-----BEGIN PRIVATE KEY-----...","duration":300}\\n' | pocketbase-cli --json settings apple-client-secret --stdin-json`
        ],
        inputSchema: createObjectInputSchema({
          description: "Apple client secret generation payload.",
          properties: {
            clientId: { type: "string" },
            teamId: { type: "string" },
            keyId: { type: "string" },
            privateKey: { type: "string" },
            duration: { type: "integer" }
          },
          required: ["clientId", "teamId", "keyId", "privateKey", "duration"],
          additionalProperties: true
        }),
        validateBody: validateAppleSecretBody,
        run: (client, body) => client.settingsGenerateAppleClientSecret({ body })
      })
    ],
    build: () => new Command("settings").description("Remote settings endpoints")
  };
}

// src/commands/sql.ts
var import_promises7 = require("fs/promises");
var SQL_CONFIRMATION_PARAMETER_HELP = "Acknowledge that raw SQL can read, modify, or delete remote data";
var SQL_CONFIRMATION_OPTION_HELP = "Acknowledge that raw SQL can read, modify, or delete data";
var SQL_INPUT_PARAMETERS = [
  createOptionParameter({
    name: "--query",
    type: "TEXT",
    help: "SQL query string to execute",
    conflictsWith: ["--file", "--stdin", "--stdin-json"],
    sensitive: true
  }),
  createOptionParameter({
    name: "--file",
    type: "TEXT",
    help: "Path to a UTF-8 SQL file or `-` to read the query from stdin",
    conflictsWith: ["--query", "--stdin", "--stdin-json"]
  }),
  createOptionParameter({
    name: "--stdin",
    type: "BOOLEAN",
    help: "Read the SQL query from stdin",
    isFlag: true,
    conflictsWith: ["--query", "--file", "--stdin-json"]
  }),
  createOptionParameter({
    name: "--stdin-json",
    type: "BOOLEAN",
    help: "Read a JSON object with a string `query` field from stdin",
    isFlag: true,
    conflictsWith: ["--query", "--file", "--stdin"]
  })
];
function buildSqlRunHistory(options) {
  if (options.file === "-") {
    return "sql run --file - --yes";
  }
  if (options.file) {
    return `sql run --file ${options.file} --yes`;
  }
  if (options.stdin) {
    return "sql run --stdin --yes";
  }
  if (options.stdinJson) {
    return "sql run --stdin-json --yes";
  }
  if (options.query !== void 0) {
    return "sql run --query <sql> --yes";
  }
  return "sql run --yes";
}
async function readSqlStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  const raw = chunks.join("");
  if (!raw.trim()) {
    throw new Error("sql.run expected SQL input on stdin.");
  }
  return raw;
}
function parseSqlJsonPayload(raw) {
  const payload = parseJsonObject(raw);
  const query = payload.query;
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("sql.run JSON input must include a non-empty string `query`.");
  }
  return query;
}
async function loadSqlQuery(options) {
  const hasQuery = options.query !== void 0;
  const hasFile = options.file !== void 0;
  const hasStdin = Boolean(options.stdin);
  const hasStdinJson = Boolean(options.stdinJson);
  const sourceCount = Number(hasQuery) + Number(hasFile) + Number(hasStdin) + Number(hasStdinJson);
  if (sourceCount !== 1) {
    throw new Error(
      "sql.run requires exactly one of `--query`, `--file`, `--stdin`, or `--stdin-json`."
    );
  }
  let query;
  if (hasQuery) {
    query = options.query ?? "";
  } else if (options.file === "-" || hasStdin) {
    query = await readSqlStdin();
  } else if (hasStdinJson) {
    query = parseSqlJsonPayload(await readStdinText("sql.run"));
  } else {
    try {
      query = await (0, import_promises7.readFile)(options.file, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read SQL file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (!query.trim()) {
    throw new Error("sql.run query must not be empty.");
  }
  return query;
}
function createSqlDefinition(context) {
  return {
    name: "sql",
    path: "sql",
    kind: "group",
    summary: "Remote SQL endpoint",
    authRequired: true,
    destructive: true,
    ...CONFIRMED_COMMAND_METADATA,
    children: [
      {
        name: "run",
        path: "sql.run",
        kind: "command",
        summary: "Run a raw SQL query on the remote PocketBase instance",
        authRequired: true,
        destructive: true,
        ...CONFIRMED_COMMAND_METADATA,
        examples: [
          "pocketbase-cli --json sql run --query 'SELECT count(*) FROM users' --yes",
          "pocketbase-cli --json sql run --file query.sql --yes",
          `printf '{"query":"SELECT 1"}\\n' | pocketbase-cli --json sql run --stdin-json --yes`
        ],
        notes: [
          "This command forwards the query to PocketBase `POST /api/sql` and requires superuser auth.",
          "Raw SQL can read, modify, or delete data; review the query before passing `--yes`."
        ],
        inputSchema: createObjectInputSchema({
          description: 'SQL run payload forwarded as `{ "query": "..." }`.',
          properties: {
            query: {
              type: "string",
              description: "Raw SQL query string to execute."
            }
          },
          required: ["query"],
          additionalProperties: false,
          examples: [{ query: "SELECT count(*) FROM users" }]
        }),
        parameters: [
          ...SQL_INPUT_PARAMETERS,
          createConfirmationParameter(SQL_CONFIRMATION_PARAMETER_HELP)
        ],
        build: () => {
          const command = new Command("run").description("Run a raw SQL query on the remote PocketBase instance").option("--query <sql>", "SQL query string to execute").option("--file <path>", "Path to a UTF-8 SQL file or `-` to read from stdin").option("--stdin", "Read the SQL query from stdin").option("--stdin-json", "Read a JSON object with a string `query` field from stdin");
          return addConfirmationOption(command, SQL_CONFIRMATION_OPTION_HELP).action(
            async (options) => {
              requireConfirmedCommand(context, {
                action: "sql.run",
                yes: options.yes,
                message: "SQL run can read, modify, or delete remote data. Re-run with `--yes` to continue.",
                hint: "Review the query, then re-run `sql run ... --yes` if it should execute."
              });
              let query;
              try {
                query = await loadSqlQuery(options);
              } catch (error) {
                emitError({
                  jsonOutput: context.jsonMode,
                  action: "sql.run",
                  message: error instanceof Error ? error.message : String(error)
                });
              }
              await recordCommand(context, buildSqlRunHistory(options));
              await runRemoteAction(context, {
                action: "sql.run",
                successMessage: "SQL run completed",
                operation: (client) => client.sqlRun({ query })
              });
            }
          );
        }
      }
    ],
    build: () => new Command("sql").description("Remote SQL endpoint")
  };
}

// src/commands/index.ts
var NOOP_REPL = async () => void 0;
var COMMAND_DEFINITIONS_CACHE = /* @__PURE__ */ new WeakMap();
function buildCommandDefinitions(context, options) {
  if (!context) {
    return [];
  }
  const runRepl = options?.runRepl ?? NOOP_REPL;
  const cached = COMMAND_DEFINITIONS_CACHE.get(context);
  if (cached && cached.runRepl === runRepl) {
    return cached.definitions;
  }
  const definitions = [
    createReplDefinition(context, runRepl),
    createInfoDefinition(context),
    createPreflightDefinition(context),
    createRawDefinition(context),
    createConfigDefinition(context),
    createAuthDefinition(context),
    createSettingsDefinition(context),
    createLogsDefinition(context),
    createCronsDefinition(context),
    createCollectionsDefinition(context),
    createFilesDefinition(context),
    createBackupsDefinition(context),
    createRecordsDefinition(context),
    createBatchDefinition(context),
    createSqlDefinition(context),
    ...createHistoryCommandDefinitions(context)
  ];
  definitions.splice(1, 0, createSchemaDefinition(context, () => definitions));
  COMMAND_DEFINITIONS_CACHE.set(context, {
    runRepl,
    definitions
  });
  return definitions;
}

// src/core/repl.ts
var import_promises8 = require("readline/promises");
var BUILTIN_HELP_LINES = [
  "Built-in REPL commands:",
  "  help                              Show this help",
  "  exit | quit                       Exit REPL",
  "  history                           Show command history",
  "  config show                       Show persisted remote defaults",
  "  config set <key> <value>          Persist remote default value",
  "  config unset <key>                Remove persisted remote default",
  "  undo                              Undo last config set/unset",
  "  redo                              Redo last undone config change"
];
var REMOTE_HELP_EXAMPLES = [
  "  info",
  "  preflight --require-auth",
  "  config set base_url https://pb.example.com",
  "  auth login --no-open",
  "  auth status",
  "  auth whoami",
  "  settings get",
  `  settings test-s3 --data '{"filesystem":"storage"}'`,
  "  logs list --per-page 5",
  "  logs stats --filter 'data.status>200'",
  "  crons list",
  "  collections list",
  "  collections scaffolds",
  "  records auth-methods users",
  "  records auth-password users test@example.com Secret123",
  "  records auth-oauth2 users --provider google --code XXX --redirect-url https://app.example.com/callback",
  "  records request-password-reset users test@example.com",
  "  records request-verification users test@example.com",
  "  records impersonate users RECORD_ID",
  "  records list users",
  "  batch run --file requests.json",
  "  sql run --query 'SELECT count(*) FROM users' --yes",
  "  files token",
  "  files url users RECORD_ID avatar.png --with-token",
  "  backups list",
  "  backups upload ./snapshot.zip",
  "  backups download nightly.zip --output /tmp/nightly.zip",
  "  backups restore nightly.zip --yes",
  "  raw GET /api/health"
];
var REPL_TOKEN_PATTERN = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/gu;
var AUTH_LOGIN_OPTIONS_WITH_VALUES = /* @__PURE__ */ new Set(["--base-url", "--collection"]);
function buildHelpText() {
  return [...BUILTIN_HELP_LINES, "", "PocketBase remote mode examples:", ...REMOTE_HELP_EXAMPLES].join(
    "\n"
  );
}
function sanitizeAuthLoginTokens(tokens) {
  const rendered = [...tokens];
  let positionalCount = 0;
  for (let index = 2; index < rendered.length; index += 1) {
    const token = rendered[index];
    if (AUTH_LOGIN_OPTIONS_WITH_VALUES.has(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith("--")) {
      continue;
    }
    positionalCount += 1;
    if (positionalCount === 2) {
      rendered[index] = "********";
    }
  }
  return rendered.join(" ");
}
function sanitizeRawHistoryPath(path) {
  const queryIndex = path.indexOf("?");
  const fragmentIndex = path.indexOf("#");
  let cutoff = path.length;
  if (queryIndex >= 0) {
    cutoff = Math.min(cutoff, queryIndex);
  }
  if (fragmentIndex >= 0) {
    cutoff = Math.min(cutoff, fragmentIndex);
  }
  const basePath = path.slice(0, cutoff);
  const hasQuery = queryIndex >= 0;
  const hasFragment = fragmentIndex >= 0;
  return `${basePath}${hasQuery ? "?<redacted>" : ""}${hasFragment ? "#<redacted>" : ""}`;
}
function hasUnterminatedQuote(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    }
  }
  return quote !== null;
}
function stringifyData2(data) {
  if (data === void 0 || data === null) {
    return "";
  }
  if (typeof data === "string") {
    return data;
  }
  return JSON.stringify(data, null, 2);
}
function writeLine2(target, value) {
  target.write(`${value}
`);
}
var ReplEofError = class extends Error {
  constructor() {
    super("REPL input closed");
  }
};
function sanitizeHistoryTokens(tokens) {
  if (tokens.length === 0) {
    return "";
  }
  if (tokens[0] === "auth" && tokens[1] === "login") {
    return sanitizeAuthLoginTokens(tokens);
  }
  if (tokens[0] !== "records") {
    if (tokens[0] === "raw" && tokens.length >= 3) {
      const rendered2 = [...tokens];
      rendered2[2] = sanitizeRawHistoryPath(rendered2[2]);
      return rendered2.join(" ");
    }
    if (tokens[0] === "files" && tokens[1] === "url") {
      const rendered2 = [...tokens];
      for (let index = 0; index < rendered2.length - 1; index += 1) {
        if (rendered2[index] === "--token") {
          rendered2[index + 1] = "********";
        }
      }
      return rendered2.join(" ");
    }
    if (tokens[0] === "backups" && tokens[1] === "download") {
      const rendered2 = [...tokens];
      for (let index = 0; index < rendered2.length - 1; index += 1) {
        if (rendered2[index] === "--token") {
          rendered2[index + 1] = "********";
        }
      }
      return rendered2.join(" ");
    }
    return tokens.join(" ");
  }
  const rendered = [...tokens];
  const subcommand = tokens[1];
  if (subcommand === "auth-password") {
    redactPositionalValue(rendered, {
      startIndex: 2,
      position: 2,
      optionsWithValues: /* @__PURE__ */ new Set(["--identity-field", "--fields", "--expand", "--mfa-id"]),
      flags: /* @__PURE__ */ new Set(["--no-save"])
    });
  } else if (subcommand === "auth-otp") {
    redactPositionalValue(rendered, {
      startIndex: 2,
      position: 2,
      optionsWithValues: /* @__PURE__ */ new Set(["--fields", "--expand", "--mfa-id"]),
      flags: /* @__PURE__ */ new Set(["--no-save"])
    });
  } else if (subcommand === "auth-oauth2") {
    for (let index = 0; index < rendered.length - 1; index += 1) {
      if (rendered[index] === "--code" || rendered[index] === "--code-verifier" || rendered[index] === "--create-data") {
        rendered[index + 1] = "********";
      }
    }
  } else if (subcommand === "confirm-password-reset" && tokens.length >= 6) {
    rendered[3] = "********";
    rendered[4] = "********";
    rendered[5] = "********";
  } else if (subcommand === "confirm-verification" && tokens.length >= 4) {
    rendered[3] = "********";
  } else if (subcommand === "confirm-email-change" && tokens.length >= 5) {
    rendered[3] = "********";
    rendered[4] = "********";
  } else {
    return tokens.join(" ");
  }
  return rendered.join(" ");
}
function redactPositionalValue(tokens, options) {
  let positionalIndex = 0;
  for (let index = options.startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (options.optionsWithValues.has(token)) {
      index += 1;
      continue;
    }
    if (options.flags.has(token) || token.startsWith("--")) {
      continue;
    }
    if (positionalIndex === options.position) {
      tokens[index] = "********";
      return;
    }
    positionalIndex += 1;
  }
}
var JsonModeLineReader = class {
  constructor() {
    this.buffer = "";
    this.iterator = process.stdin[Symbol.asyncIterator]();
  }
  async nextLine() {
    for (; ; ) {
      const newlineIndex = this.buffer.indexOf("\n");
      if (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex);
        this.buffer = this.buffer.slice(newlineIndex + 1);
        return line.replace(/\r$/u, "");
      }
      const next = await this.iterator.next();
      if (next.done) {
        if (!this.buffer) {
          throw new ReplEofError();
        }
        const line = this.buffer;
        this.buffer = "";
        return line.replace(/\r$/u, "");
      }
      this.buffer += String(next.value);
    }
  }
};
var PocketBaseRepl = class {
  constructor(options) {
    this.pendingStateSave = false;
    this.context = options.context;
    this.dispatch = options.dispatch;
    this.jsonOutput = options.jsonOutput;
    this.saveState = options.saveState ?? (() => saveContextState(this.context));
    this.stdout = options.stdout ?? process.stdout;
    this.stderr = options.stderr ?? process.stderr;
    this.readLine = options.readLine;
  }
  async run() {
    const previousOnStateSaved = this.context.onStateSaved;
    this.context.onStateSaved = () => {
      this.pendingStateSave = false;
      previousOnStateSaved?.();
    };
    this.emit({
      ok: true,
      action: "repl.start",
      message: "PocketBase REPL started. Type 'help' for commands.",
      data: { json_mode: this.jsonOutput }
    });
    try {
      for (; ; ) {
        let line;
        try {
          line = await this.readNextLine();
        } catch (error) {
          if (error instanceof ReplEofError) {
            await this.persistStateIfNeeded();
            this.emit({
              ok: true,
              action: "repl.exit",
              message: "Bye."
            });
            return;
          }
          throw error;
        }
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const tokens = this.parseLine(trimmed);
        if (!tokens) {
          continue;
        }
        this.context.state.recordCommand(sanitizeHistoryTokens(tokens));
        this.pendingStateSave = true;
        const command = tokens[0];
        if (command === "exit" || command === "quit") {
          await this.persistStateIfNeeded();
          this.emit({
            ok: true,
            action: "repl.exit",
            message: "Bye."
          });
          return;
        }
        if (command === "help" || command === "?") {
          this.emit({
            ok: true,
            action: "help",
            message: buildHelpText()
          });
          await this.persistStateIfNeeded();
          continue;
        }
        if (command === "history") {
          this.emit({
            ok: true,
            action: "history",
            message: "Command history",
            data: { items: this.context.state.commandHistory }
          });
          await this.persistStateIfNeeded();
          continue;
        }
        if (command === "undo") {
          await this.handleUndo();
          await this.persistStateIfNeeded();
          continue;
        }
        if (command === "redo") {
          await this.handleRedo();
          await this.persistStateIfNeeded();
          continue;
        }
        if (command === "config") {
          await this.handleConfig(tokens.slice(1));
          await this.persistStateIfNeeded();
          continue;
        }
        try {
          await this.dispatch(tokens);
        } catch (error) {
          if (error instanceof CliExitError) {
            await this.persistStateIfNeeded();
            continue;
          }
          this.emit({
            ok: false,
            action: "repl.dispatch",
            message: error instanceof Error ? error.message : String(error)
          });
        }
        await this.persistStateIfNeeded();
      }
    } finally {
      this.interactiveReader?.close();
      this.interactiveReader = void 0;
      this.context.onStateSaved = previousOnStateSaved;
    }
  }
  async readNextLine() {
    if (this.readLine) {
      return this.readLine();
    }
    if (this.jsonOutput) {
      this.jsonReader ??= new JsonModeLineReader();
      return this.jsonReader.nextLine();
    }
    this.interactiveReader ??= (0, import_promises8.createInterface)({
      input: process.stdin,
      output: process.stdout
    });
    try {
      return await this.interactiveReader.question("pocketbase> ");
    } catch {
      throw new ReplEofError();
    }
  }
  parseLine(line) {
    if (hasUnterminatedQuote(line)) {
      this.emit({
        ok: false,
        action: "repl.parse",
        message: "Unterminated quoted string in REPL input.",
        errorType: "invalid_input"
      });
      return null;
    }
    const tokens = [];
    REPL_TOKEN_PATTERN.lastIndex = 0;
    let match;
    while ((match = REPL_TOKEN_PATTERN.exec(line)) !== null) {
      const value = match[1] ?? match[2] ?? match[3];
      tokens.push(value.replace(/\\(["'])/gu, "$1"));
    }
    if (tokens.length === 0) {
      this.emit({
        ok: false,
        action: "repl.parse",
        message: "Unable to parse REPL input.",
        errorType: "invalid_input"
      });
      return null;
    }
    return tokens;
  }
  async persistState() {
    await this.saveState();
    this.pendingStateSave = false;
  }
  async persistStateIfNeeded() {
    if (this.pendingStateSave) {
      await this.persistState();
    }
  }
  async handleUndo() {
    try {
      const payload = this.context.state.undo();
      const authChange = clearRemoteAuthIfConfigTargetChanged(this.context);
      await this.persistState();
      this.emit({
        ok: true,
        action: "undo",
        message: authChange.auth_cleared ? "Undo applied and saved auth cleared" : "Undo applied",
        data: {
          ...payload,
          ...authChange
        }
      });
    } catch (error) {
      this.emit({
        ok: false,
        action: "undo",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  async handleRedo() {
    try {
      const payload = this.context.state.redo();
      const authChange = clearRemoteAuthIfConfigTargetChanged(this.context);
      await this.persistState();
      this.emit({
        ok: true,
        action: "redo",
        message: authChange.auth_cleared ? "Redo applied and saved auth cleared" : "Redo applied",
        data: {
          ...payload,
          ...authChange
        }
      });
    } catch (error) {
      this.emit({
        ok: false,
        action: "redo",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  async handleConfig(tokens) {
    if (tokens.length === 0 || tokens[0] === "show") {
      this.emit({
        ok: true,
        action: "config.show",
        message: "Current config",
        data: this.context.state.config
      });
      return;
    }
    if (tokens[0] === "set") {
      if (tokens.length < 3) {
        this.emit({
          ok: false,
          action: "config.set",
          message: "Usage: config set <key> <value>",
          errorType: "usage_error"
        });
        return;
      }
      const key = tokens[1];
      const rawValue = tokens.slice(2).join(" ");
      try {
        if (!isConfigKey(key)) {
          throw new Error(`Unknown config key: ${key}`);
        }
        const value = parseConfigValue(key, rawValue);
        const payload = this.context.state.setConfig(key, value);
        const authChange = clearRemoteAuthIfConfigTargetChanged(this.context);
        await this.persistState();
        this.emit({
          ok: true,
          action: "config.set",
          message: authChange.auth_cleared ? "Config updated and saved auth cleared" : "Config updated",
          data: {
            ...payload,
            ...authChange
          }
        });
      } catch (error) {
        this.emit({
          ok: false,
          action: "config.set",
          message: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }
    if (tokens[0] === "unset") {
      if (tokens.length !== 2) {
        this.emit({
          ok: false,
          action: "config.unset",
          message: "Usage: config unset <key>",
          errorType: "usage_error"
        });
        return;
      }
      try {
        const key = tokens[1];
        if (!isConfigKey(key)) {
          throw new Error(`Unknown config key: ${key}`);
        }
        const payload = this.context.state.unsetConfig(key);
        const authChange = clearRemoteAuthIfConfigTargetChanged(this.context);
        await this.persistState();
        this.emit({
          ok: true,
          action: "config.unset",
          message: authChange.auth_cleared ? "Config removed and saved auth cleared" : "Config removed",
          data: {
            ...payload,
            ...authChange
          }
        });
      } catch (error) {
        this.emit({
          ok: false,
          action: "config.unset",
          message: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }
    this.emit({
      ok: false,
      action: "config",
      message: "Unknown config command",
      errorType: "invalid_input"
    });
  }
  emit(options) {
    if (this.jsonOutput) {
      const target2 = options.ok ? this.stdout : this.stderr;
      const payload = options.ok ? buildSuccessEnvelope({
        action: options.action,
        message: options.message,
        data: options.data
      }) : buildErrorEnvelope({
        action: options.action,
        message: options.message,
        code: options.code,
        data: options.data,
        errorType: options.errorType,
        hint: options.hint,
        missingPrerequisite: options.missingPrerequisite
      });
      writeLine2(target2, JSON.stringify(payload));
      return;
    }
    const target = options.ok ? this.stdout : this.stderr;
    writeLine2(target, options.message);
    const rendered = stringifyData2(options.data);
    if (rendered) {
      writeLine2(target, rendered);
    }
  }
};
async function startRepl(options) {
  const repl = new PocketBaseRepl({
    context: options.context,
    dispatch: options.dispatch,
    jsonOutput: options.jsonOutput ?? options.context.jsonMode
  });
  await repl.run();
}

// src/cli.ts
var REPL_DISPATCH_CLI_CACHE = /* @__PURE__ */ new WeakMap();
var REPL_ROOT_COMMANDS = /* @__PURE__ */ new Set([
  "repl",
  "info",
  "preflight",
  "schema",
  "raw",
  "config",
  "auth",
  "settings",
  "logs",
  "crons",
  "collections",
  "files",
  "backups",
  "records",
  "batch",
  "sql",
  "undo",
  "redo",
  "history"
]);
function inferReplAction(tokens) {
  if (tokens.length === 0) {
    return "repl.dispatch";
  }
  if (tokens.length === 1) {
    return tokens[0];
  }
  return `${tokens[0]}.${tokens[1]}`;
}
async function dispatchReplTokens(context, tokens) {
  if (tokens[0] === "repl") {
    throw new Error("Nested REPL sessions are not supported.");
  }
  if (!REPL_ROOT_COMMANDS.has(tokens[0])) {
    emitError({
      jsonOutput: context.jsonMode,
      action: "repl.dispatch",
      message: `Unknown command: ${tokens[0]}`
    });
  }
  let cli = REPL_DISPATCH_CLI_CACHE.get(context);
  if (!cli) {
    cli = createCli(context, { launchReplOnEmpty: false });
    cli.exitOverride();
    REPL_DISPATCH_CLI_CACHE.set(context, cli);
  }
  context.suppressHistory = true;
  try {
    const argv = context.jsonMode ? ["--json", ...tokens] : tokens;
    await cli.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      emitError({
        jsonOutput: context.jsonMode,
        action: inferReplAction(tokens),
        message: error.message,
        errorType: "usage_error"
      });
    }
    throw error;
  } finally {
    context.suppressHistory = false;
  }
}
async function runCliRepl(context) {
  await startRepl({
    context,
    dispatch: async (tokens) => {
      await dispatchReplTokens(context, tokens);
    }
  });
}
function createCli(context, options) {
  const launchReplOnEmpty = options?.launchReplOnEmpty ?? true;
  const initialJsonMode = context.jsonMode;
  const program2 = new Command("pocketbase-cli").description("Remote-only PocketBase CLI for deployed PocketBase instances").showHelpAfterError().option("--json", "output JSON").hook("preAction", () => {
    context.jsonMode = program2.opts().json ?? initialJsonMode;
  });
  registerCommandDefinitions(
    program2,
    buildCommandDefinitions(context, {
      runRepl: async () => {
        await runCliRepl(context);
      }
    })
  );
  program2.action(async () => {
    if (!program2.args?.length) {
      if (launchReplOnEmpty) {
        await runCliRepl(context);
        return;
      }
      await program2.outputHelp();
    }
  });
  return program2;
}

// src/bin.ts
async function main() {
  const context = await createAppContext();
  const cli = createCli(context);
  try {
    await cli.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CliExitError) {
      process.exitCode = error.code;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("pocketbase-cli:", message);
    process.exitCode = 1;
  }
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("pocketbase-cli:", message);
  process.exit(1);
});
//# sourceMappingURL=bin.js.map
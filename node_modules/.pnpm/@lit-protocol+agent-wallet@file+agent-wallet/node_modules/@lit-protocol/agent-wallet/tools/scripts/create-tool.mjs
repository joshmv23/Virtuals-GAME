#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Validate and process command line arguments
 */
const toolName = process.argv[2];
if (!toolName) {
  console.error('Please provide a tool name: pnpm new-tool <tool-name>');
  process.exit(1);
}

const packageName = `aw-tool-${toolName}`;
const className = toolName
  .split('-')
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join('');

/**
 * Prompts the user to define tool parameters.
 * Each parameter requires a name, type, description, and validation rule.
 * The pkpEthAddress parameter is automatically included.
 */
async function promptForParameters() {
  const parameters = [];
  let addMore = true;

  console.log('\nLet\'s define your tool parameters (in addition to pkpEthAddress):');
  
  while (addMore) {
    const { paramName } = await prompts({
      type: 'text',
      name: 'paramName',
      message: 'Enter parameter name (or press enter to finish):',
    });

    if (!paramName) {
      addMore = false;
      continue;
    }

    const { paramType } = await prompts({
      type: 'select',
      name: 'paramType',
      message: 'Select parameter type:',
      choices: [
        { title: 'string', value: 'string' },
        { title: 'number', value: 'number' },
        { title: 'boolean', value: 'boolean' },
        { title: 'string[]', value: 'string[]' },
      ],
    });

    const { paramDescription } = await prompts({
      type: 'text',
      name: 'paramDescription',
      message: 'Enter parameter description:',
    });

    const { validation } = await prompts({
      type: 'text',
      name: 'validation',
      message: 'Enter zod validation (leave empty for default):',
      initial: paramType === 'string' ? 'z.string()' : 
               paramType === 'number' ? 'z.number()' :
               paramType === 'boolean' ? 'z.boolean()' :
               'z.array(z.string())',
    });

    parameters.push({
      name: paramName,
      type: paramType,
      description: paramDescription,
      validation: validation,
    });
  }

  return parameters;
}

/**
 * Prompts the user to define policy parameters.
 * Each parameter requires a name, type, and description.
 */
async function promptForPolicyParameters() {
  const parameters = [];
  let addMore = true;

  console.log('\nLet\'s define your policy parameters:');
  
  while (addMore) {
    const { paramName } = await prompts({
      type: 'text',
      name: 'paramName',
      message: 'Enter policy parameter name (or press enter to finish):',
    });

    if (!paramName) {
      addMore = false;
      continue;
    }

    const { paramType } = await prompts({
      type: 'select',
      name: 'paramType',
      message: 'Select parameter type:',
      choices: [
        { title: 'string', value: 'string' },
        { title: 'number', value: 'number' },
        { title: 'boolean', value: 'boolean' },
        { title: 'string[]', value: 'string[]' },
      ],
    });

    const { paramDescription } = await prompts({
      type: 'text',
      name: 'paramDescription',
      message: 'Enter parameter description:',
    });

    parameters.push({
      name: paramName,
      type: paramType,
      description: paramDescription,
    });
  }

  return parameters;
}

/**
 * Get tool and policy parameters from user input
 */
const toolParams = await promptForParameters();
const policyParams = await promptForPolicyParameters();

const packagePath = join(__dirname, '../../packages', packageName);

console.log(`Creating new tool package: ${packageName}...`);

/**
 * Generate package scaffold using Nx
 */
try {
  execSync(`npx nx g @nx/js:lib packages/${packageName} --publishable --importPath=@lit-protocol/${packageName}`, {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Failed to generate package scaffold:', error);
  process.exit(1);
}

/**
 * Copy and configure files from template package
 */
const templatePackage = 'aw-tool-sign-ecdsa';
const templatePath = join(__dirname, '../../packages', templatePackage);
const configFiles = [
  'tsconfig.lib.json',
  'tsconfig.json',
  'tsconfig.spec.json',
  'package.json',
  'jest.config.ts',
  'eslint.config.cjs',
  '.gitignore',
  'README.md'
];

configFiles.forEach(file => {
  try {
    let content = readFileSync(join(templatePath, file), 'utf8');
    
    if (file === 'package.json') {
      const newPackageJson = {
        name: `@lit-protocol/${packageName}`,
        version: "0.1.0-1",
        publishConfig: {
          access: "public"
        },
        dependencies: {
          "@lit-protocol/aw-tool": "workspace:*",
          "ethers": "^5.7.2",
          "tslib": "^2.8.1",
          "zod": "^3.24.1"
        },
        devDependencies: {
          "@dotenvx/dotenvx": "^1.31.3",
          "esbuild": "^0.19.11",
          "node-fetch": "^2.7.0"
        },
        type: "commonjs",
        main: "./dist/src/index.js",
        types: "./dist/src/index.d.ts",
        typings: "./dist/src/index.d.ts",
        files: [
          "dist",
          "!**/*.tsbuildinfo"
        ],
        nx: {
          sourceRoot: `packages/${packageName}/src`,
          projectType: "library",
          targets: {
            build: {
              executor: "@nx/js:tsc",
              outputs: ["{options.outputPath}"],
              options: {
                outputPath: `packages/${packageName}/dist`,
                main: `packages/${packageName}/src/index.ts`,
                tsConfig: `packages/${packageName}/tsconfig.lib.json`,
                assets: [`packages/${packageName}/*.md`]
              }
            },
            "build:action": {
              executor: "nx:run-commands",
              dependsOn: ["build"],
              options: {
                commands: ["node tools/scripts/build-lit-action.js"],
                cwd: `packages/${packageName}`,
                parallel: false
              },
              outputs: [
                `{workspaceRoot}/packages/${packageName}/dist/deployed-lit-action.js`
              ]
            },
            deploy: {
              executor: "nx:run-commands",
              dependsOn: ["build:action"],
              options: {
                commands: ["node tools/scripts/deploy-lit-action.js"],
                cwd: `packages/${packageName}`
              }
            },
            publish: {
              executor: "@nx/js:npm-publish",
              dependsOn: ["deploy"],
              options: {
                packageRoot: "dist"
              }
            }
          },
          name: packageName
        }
      };
      
      content = JSON.stringify(newPackageJson, null, 2);
    }
    
    if (file === 'README.md') {
      content = content.replace(new RegExp(templatePackage, 'g'), packageName)
                      .replace(/Sign ECDSA/g, className.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    }
    
    writeFileSync(join(packagePath, file), content);
  } catch (error) {
    console.warn(`Warning: Could not copy ${file}:`, error.message);
  }
});

/**
 * Create source file structure
 */
const srcPath = join(packagePath, 'src');
const libPath = join(srcPath, 'lib');
const litActionsPath = join(libPath, 'lit-actions');
const litActionsUtilsPath = join(litActionsPath, 'utils');
const testPath = join(packagePath, 'test');
const toolsPath = join(packagePath, 'tools');

[libPath, litActionsPath, litActionsUtilsPath, testPath, toolsPath].forEach(dir => {
  mkdirSync(dir, { recursive: true });
});

/**
 * Clean up Nx-generated files
 */
try {
  unlinkSync(join(libPath, `${packageName}.ts`));
  unlinkSync(join(libPath, `${packageName}.spec.ts`));
} catch (error) {
  console.warn('Warning: Could not clean up Nx-generated files:', error.message);
}

/**
 * Copy ipfs.ts from template
 */
copyFileSync(
  join(templatePath, 'src/lib/ipfs.ts'),
  join(libPath, 'ipfs.ts')
);

/**
 * Create other required files with templates
 */
const policyTemplate = `import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Schema for validating a ${className} policy.
 * Ensures the policy has the correct structure and valid values.
 */
const policySchema = z.object({
  /** The type of policy, must be \`${className}\`. */
  type: z.literal('${className}'),

  /** The version of the policy. */
  version: z.string(),

  ${policyParams.map(param => `/** ${param.description} */
  ${param.name}: ${param.type === 'string[]' ? 'z.array(z.string())' : `z.${param.type}()`}`).join(',\n\n  ')}
});

/**
 * Encodes a ${className} policy into a format suitable for on-chain storage.
 * @param policy - The ${className} policy to encode.
 * @returns The encoded policy as a hex string.
 * @throws If the policy does not conform to the schema.
 */
function encodePolicy(policy: ${className}PolicyType): string {
  // Validate the policy against the schema
  policySchema.parse(policy);

  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(${policyParams.map(p => `${p.type} ${p.name}`).join(', ')})'],
    [policy]
  );
}

/**
 * Decodes a ${className} policy from its on-chain encoded format.
 * @param encodedPolicy - The encoded policy as a hex string.
 * @returns The decoded ${className} policy.
 * @throws If the encoded policy is invalid or does not conform to the schema.
 */
function decodePolicy(encodedPolicy: string): ${className}PolicyType {
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(${policyParams.map(p => `${p.type} ${p.name}`).join(', ')})'],
    encodedPolicy
  )[0];

  const policy: ${className}PolicyType = {
    type: '${className}',
    version: '1.0.0',
    ${policyParams.map(p => `${p.name}: decoded.${p.name}`).join(',\n    ')}
  };

  return policySchema.parse(policy);
}

/**
 * Represents the type of a ${className} policy, inferred from the schema.
 */
export type ${className}PolicyType = z.infer<typeof policySchema>;

/**
 * Utility object for working with ${className} policies.
 * Includes the schema, encoding, and decoding functions.
 */
export const ${className}Policy = {
  /** The type of the policy. */
  type: {} as ${className}PolicyType,

  /** The version of the policy. */
  version: '1.0.0',

  /** The schema for validating ${className} policies. */
  schema: policySchema,

  /** Encodes a ${className} policy into a format suitable for on-chain storage. */
  encode: encodePolicy,

  /** Decodes a ${className} policy from its on-chain encoded format. */
  decode: decodePolicy,
};`;

const litActionToolTemplate = `import {
  fetchToolPolicyFromRegistry,
  getPkpInfo,
  getPkpToolRegistryContract,
  NETWORK_CONFIG,
} from '@lit-protocol/aw-tool';

declare global {
  // Required Inputs
  const params: {
    pkpEthAddress: string;
    ${toolParams.map(p => `${p.name}: ${p.type}`).join(';\n    ')};
  };
}

(async () => {
  try {
    console.log(\`Using Lit Network: \${LIT_NETWORK}\`);
    console.log(
      \`Using PKP Tool Registry Address: \${PKP_TOOL_REGISTRY_ADDRESS}\`
    );
    console.log(
      \`Using Pubkey Router Address: \${
        NETWORK_CONFIG[LIT_NETWORK as keyof typeof NETWORK_CONFIG]
          .pubkeyRouterAddress
      }\`
    );

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    const pkpToolRegistryContract = await getPkpToolRegistryContract(
      PKP_TOOL_REGISTRY_ADDRESS
    );
    const pkp = await getPkpInfo(params.pkpEthAddress);

    const toolPolicy = await fetchToolPolicyFromRegistry(
      pkpToolRegistryContract,
      pkp.tokenId,
      delegateeAddress,
      toolIpfsCid
    );

    if (
      toolPolicy.enabled &&
      toolPolicy.policyIpfsCid !== undefined &&
      toolPolicy.policyIpfsCid !== '0x' &&
      toolPolicy.policyIpfsCid !== ''
    ) {
      console.log(\`Executing policy \${toolPolicy.policyIpfsCid}\`);
      await Lit.Actions.call({
        ipfsId: toolPolicy.policyIpfsCid,
        params: {
          parentToolIpfsCid: toolIpfsCid,
          pkpToolRegistryContractAddress: PKP_TOOL_REGISTRY_ADDRESS,
          pkpTokenId: pkp.tokenId,
          delegateeAddress,
          toolParameters: params,
        },
      });
    } else {
      console.log(
        \`No policy found for tool \${toolIpfsCid} on PKP \${pkp.tokenId} for delegatee \${delegateeAddress}\`
      );
    }

    // Add your tool execution logic here

    Lit.Actions.setResponse({
      response: JSON.stringify({
        response: 'Success!',
        status: 'success',
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: err.message || String(err),
      }),
    });
  }
})();`;

const toolTemplate = `import { z } from 'zod';
import {
  type AwTool,
  type SupportedLitNetwork,
  NETWORK_CONFIGS,
  NetworkConfig,
} from '@lit-protocol/aw-tool';

import { ${className}Policy, type ${className}PolicyType } from './policy';
import { IPFS_CIDS } from './ipfs';

/**
 * Parameters required for the ${className} Lit Action.
 * @property {string} pkpEthAddress - The Ethereum address of the PKP.
 ${toolParams.map(p => `* @property {${p.type}} ${p.name} - ${p.description}`).join('\n ')}
 */
export interface ${className}LitActionParameters {
  pkpEthAddress: string;
  ${toolParams.map(p => `${p.name}: ${p.type}`).join(';\n  ')};
}

/**
 * Zod schema for validating \`${className}LitActionParameters\`.
 */
const ${className}LitActionSchema = z.object({
  pkpEthAddress: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),
  ${toolParams.map(p => `${p.name}: ${p.validation}`).join(',\n  ')}
});

/**
 * Descriptions of each parameter for the ${className} Lit Action.
 * These descriptions are designed to be consumed by LLMs (Language Learning Models) to understand the required parameters.
 */
const ${className}LitActionParameterDescriptions = {
  pkpEthAddress:
    'The Ethereum address of the PKP that will be used to perform the action.',
  ${toolParams.map(p => `${p.name}: '${p.description}'`).join(',\n  ')}
} as const;

/**
 * Validates the parameters for the ${className} Lit Action.
 * @param params - The parameters to validate.
 * @returns \`true\` if the parameters are valid, or an array of errors if invalid.
 */
const validate${className}Parameters = (
  params: unknown
): true | Array<{ param: string; error: string }> => {
  const result = ${className}LitActionSchema.safeParse(params);
  if (result.success) {
    return true;
  }

  // Map validation errors to a more user-friendly format
  return result.error.issues.map((issue) => ({
    param: issue.path[0] as string,
    error: issue.message,
  }));
};

/**
 * Creates a network-specific ${className} tool.
 * @param network - The supported Lit network (e.g., \`datil-dev\`, \`datil-test\`, \`datil\`).
 * @param config - The network configuration.
 * @returns A configured \`AwTool\` instance for the ${className} Lit Action.
 */
const createNetworkTool = (
  network: SupportedLitNetwork,
  config: NetworkConfig
): AwTool<${className}LitActionParameters, ${className}PolicyType> => ({
  name: '${className}',
  description: \`${className} Tool\`,
  ipfsCid: IPFS_CIDS[network].tool,
  defaultPolicyIpfsCid: IPFS_CIDS[network].defaultPolicy,
  parameters: {
    type: {} as ${className}LitActionParameters,
    schema: ${className}LitActionSchema,
    descriptions: ${className}LitActionParameterDescriptions,
    validate: validate${className}Parameters,
  },
  policy: ${className}Policy,
});

/**
 * Exports network-specific ${className} tools.
 * Each tool is configured for a specific Lit network (e.g., \`datil-dev\`, \`datil-test\`, \`datil\`).
 */
export const ${className} = Object.entries(NETWORK_CONFIGS).reduce(
  (acc, [network, config]) => ({
    ...acc,
    [network]: createNetworkTool(network as SupportedLitNetwork, config),
  }),
  {} as Record<
    SupportedLitNetwork,
    AwTool<${className}LitActionParameters, ${className}PolicyType>
  >
);`;

const indexTemplate = `export { ${className} } from './lib/tool';`;

const litActionPolicyTemplate = `import {
  checkLitAuthAddressIsDelegatee,
  getPkpToolRegistryContract,
  getPolicyParameters,
} from '@lit-protocol/aw-tool';

declare global {
  // Required Inputs
  const parentToolIpfsCid: string;
  const pkpToolRegistryContractAddress: string;
  const pkpTokenId: string;
  const delegateeAddress: string;
  const toolParameters: {
    ${toolParams.map(p => `${p.name}: ${p.type}`).join(';\n    ')};
  };
}

(async () => {
  const pkpToolRegistryContract = await getPkpToolRegistryContract(
    pkpToolRegistryContractAddress
  );

  const isDelegatee = await checkLitAuthAddressIsDelegatee(
    pkpToolRegistryContract,
    pkpTokenId
  );
  if (!isDelegatee) {
    throw new Error(
      \`Session signer \${ethers.utils.getAddress(
        LitAuth.authSigAddress
      )} is not a delegatee for PKP \${pkpTokenId}\`
    );
  }

  // Get policy parameters
  const policyParameters = await getPolicyParameters(
    pkpToolRegistryContract,
    pkpTokenId,
    parentToolIpfsCid,
    delegateeAddress,
    [
      ${policyParams.map(p => `'${p.name}'`).join(',\n      ')}
    ]
  );

  // Add your policy validation logic here using policyParameters
})();`;

writeFileSync(join(litActionsPath, 'policy.ts'), litActionPolicyTemplate);
writeFileSync(join(litActionsPath, 'tool.ts'), litActionToolTemplate);
writeFileSync(join(libPath, 'policy.ts'), policyTemplate);
writeFileSync(join(libPath, 'tool.ts'), toolTemplate);
writeFileSync(join(srcPath, 'index.ts'), indexTemplate);

/**
 * Copy tools directory from template
 */
try {
  execSync(`cp -r ${join(templatePath, 'tools/*')} ${toolsPath}`, { stdio: 'inherit' });
} catch (error) {
  console.warn('Warning: Could not copy tools directory:', error.message);
}

/**
 * Updates the deploy:tools script in root package.json to include the new tool
 */
function updateDeployToolsScript() {
  const rootPackageJsonPath = join(__dirname, '../../package.json');
  const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));

  if (!rootPackageJson.scripts['deploy:tools'].includes(packageName)) {
    // Split existing tools into array
    const currentScript = rootPackageJson.scripts['deploy:tools'];
    const tools = currentScript.split('&&').map(cmd => cmd.trim());
    
    // Add new tool
    tools.push(`npx nx deploy ${packageName}`);
    
    // Join back together
    rootPackageJson.scripts['deploy:tools'] = tools.join(' && ');

    writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
    console.log(`✨ Added ${packageName} to deploy:tools script`);
  }
}

/**
 * Update tool registry and deploy script
 */
console.log('\nUpdating tool registry and deploy script...');
updateToolRegistryPackageJson();
updateRegistryTs();
updateDeployToolsScript();

console.log(`
✨ Tool package created successfully!

Next, implement your tool's logic in:
   - src/lib/lit-actions/utils/ (utility functions for the Lit Action code)
   - src/lib/lit-actions/tool.ts (Lit Action code)
   - src/lib/lit-actions/policy.ts (Lit Action policy validation)
`);

/**
 * Updates the tool registry's package.json to include the new tool as a dependency
 */
function updateToolRegistryPackageJson() {
  const registryPackageJsonPath = join(__dirname, '../../packages/aw-tool-registry/package.json');
  const registryPackageJson = JSON.parse(readFileSync(registryPackageJsonPath, 'utf8'));

  if (!registryPackageJson.dependencies[`@lit-protocol/${packageName}`]) {
    registryPackageJson.dependencies[`@lit-protocol/${packageName}`] = 'workspace:*';
    
    const sortedDependencies = {};
    Object.keys(registryPackageJson.dependencies).sort().forEach(key => {
      sortedDependencies[key] = registryPackageJson.dependencies[key];
    });
    registryPackageJson.dependencies = sortedDependencies;

    writeFileSync(registryPackageJsonPath, JSON.stringify(registryPackageJson, null, 2) + '\n');
    console.log(`✨ Added ${packageName} to tool registry's package.json`);
  }
}

/**
 * Updates registry.ts to import and register the new tool
 */
function updateRegistryTs() {
  const registryTsPath = join(__dirname, '../../packages/aw-tool-registry/src/lib/registry.ts');
  let registryTsContent = readFileSync(registryTsPath, 'utf8');

  const importStatement = `import { ${className} } from '@lit-protocol/${packageName}';`;
  if (!registryTsContent.includes(importStatement)) {
    const lastImportIndex = registryTsContent.lastIndexOf('import');
    const lastImportEndIndex = registryTsContent.indexOf(';', lastImportIndex) + 1;
    
    registryTsContent = 
      registryTsContent.slice(0, lastImportEndIndex) + 
      '\n' + importStatement + 
      registryTsContent.slice(lastImportEndIndex);
  }

  const registrationStatement = `registerTool('${className}', ${className});`;
  if (!registryTsContent.includes(registrationStatement)) {
    const lastRegisterIndex = registryTsContent.lastIndexOf('registerTool');
    if (lastRegisterIndex !== -1) {
      const lastRegisterEndIndex = registryTsContent.indexOf(';', lastRegisterIndex) + 1;

      registryTsContent = 
        registryTsContent.slice(0, lastRegisterEndIndex) + 
        '\n' + registrationStatement + 
        registryTsContent.slice(lastRegisterEndIndex);
    } else {
      registryTsContent += '\n' + registrationStatement + '\n';
    }
  }

  writeFileSync(registryTsPath, registryTsContent);
  console.log(`✨ Added ${className} to registry.ts`);
} 
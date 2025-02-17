import {
  LitNetwork,
  type PkpInfo,
  type DelegatedPkpInfo,
} from '@lit-protocol/agent-wallet';
import { LIT_CHAINS } from '@lit-protocol/constants';

import {
  AdminErrors,
  DelegateeErrors,
  getLitNetwork,
  LawCliError,
  LocalStorage,
  logger,
  StorageKeys,
} from './core';
import {
  CliSettingsMenuChoice,
  handleAddRpc,
  handleChangeLitNetwork,
  handleCliSettingsMenu,
  handleEditRpc,
  handleMainMenu,
  handleManageRpcsMenu,
  handleRemoveRpc,
  MainMenuChoice,
  ManageRpcsMenuChoice,
  AdminMenuChoice,
  handleAdminMenu,
  handleAdminSettingsMenu,
  AdminSettingsMenuChoice,
  Admin,
  ManageToolsMenuChoice,
  handleManageToolsMenu,
  handlePermitTool,
  handleRemoveTool,
  handleEnableTool,
  handleDisableTool,
  handleGetTools,
  handleGetPolicies,
  ManagePoliciesMenuChoice,
  handleDisablePolicy,
  handleEnablePolicy,
  handleRemovePolicy,
  handleSetPolicy,
  handleManagePoliciesMenu,
  handleGetToolPolicy,
  handleManageDelegateesMenu,
  handleIsDelegatee,
  handleRemoveDelegatee,
  handleAddDelegatee,
  handleGetDelegatees,
  ManageDelegateesMenuChoice,
  handlePermitToolForDelegatee,
  handleUnpermitToolForDelegatee,
  handleGetToolPolicyParameter,
  handleRemoveToolPolicyParameter,
  handleSetToolPolicyParameter,
  Delegatee,
  handleDelegateeMenu,
  DelegateeMenuChoice,
  DelegateeSettingsMenuChoice,
  handleDelegateeSettingsMenu,
  handleConfigureDelegateeSignerMenu,
  handleConfigureAdminSignerMenu,
  AdminConfigureSignerMenuChoice,
  DelegateeConfigureSignerMenuChoice,
  handleUseEoaForAdmin,
  handleUseEoaForDelegatee,
  handleSelectPkpForAdmin,
  handleSelectPkpForDelegatee,
  handleGetDelegatedPkps,
  handleGetRegisteredTools,
  handleGetToolPolicyForDelegatee,
  handleGetToolViaIntent,
  handleGetIntentMatcher,
  handleExecuteTool,
  handleExecuteToolViaIntent,
} from './main-menu';

export class LawCli {
  private static readonly DEFAULT_STORAGE_PATH = './.law-cli-storage';

  private localStorage: LocalStorage;

  public litNetwork: LitNetwork;
  public admin?: Admin;
  public delegatee?: Delegatee;

  private constructor(localStorage: LocalStorage, litNetwork: LitNetwork) {
    this.localStorage = localStorage;
    this.litNetwork = litNetwork;

    logger.info(`CLI storage loading from: ${LawCli.DEFAULT_STORAGE_PATH}`);
    logger.info(`Using Lit network: ${this.litNetwork}`);

    LawCli.populateDefaultRpcs(localStorage);
  }

  private static initStorage() {
    return new LocalStorage(LawCli.DEFAULT_STORAGE_PATH);
  }

  private static populateDefaultRpcs(localStorage: LocalStorage) {
    // Check if RPCs already exist
    const existingRpcsString = localStorage.getItem(StorageKeys.RPCS);
    if (existingRpcsString) {
      return; // RPCs already exist, don't overwrite them
    }

    // Only populate default RPCs if none exist
    const sortedChains = Object.fromEntries(
      Object.entries(LIT_CHAINS).sort(([, a], [, b]) =>
        a.name.localeCompare(b.name)
      )
    );
    localStorage.setItem(StorageKeys.RPCS, JSON.stringify(sortedChains));
  }

  private static async showMainMenu(lawCli: LawCli) {
    const option = await handleMainMenu();

    switch (option) {
      case MainMenuChoice.AdminMenu:
        await LawCli.handleAdminMenu(lawCli);
        break;
      case MainMenuChoice.DelegateeMenu:
        await LawCli.handleDelegateeMenu(lawCli);
        break;
      case MainMenuChoice.CliSettings:
        await LawCli.handleCliSettingsMenu(lawCli);
        break;
    }

    // If we reach this point, that means the user has exited the CLI,
    // or one of the CLI options didn't loop back to a menu.
    if (lawCli.admin !== undefined) {
      lawCli.admin.awAdmin.disconnect();
    }
    if (lawCli.delegatee !== undefined) {
      lawCli.delegatee.awDelegatee.disconnect();
    }

    process.exit(0);
  }

  private static async handleSelectPkp(lawCli: LawCli) {
    try {
      const pkpOrNull = await handleSelectPkpForAdmin(lawCli.admin!);
      if (pkpOrNull === null) {
        await LawCli.handleAdminMenu(lawCli);
      }
      return pkpOrNull as PkpInfo;
    } catch (error) {
      if (error instanceof LawCliError) {
        if (
          error.type === AdminErrors.NO_PKPS_FOUND ||
          error.type === AdminErrors.PKP_SELECTION_CANCELLED
        ) {
          await LawCli.handleAdminMenu(lawCli);
        }
      }
      throw error;
    }
  }

  private static async handleSelectDelegatedPkp(
    lawCli: LawCli
  ): Promise<DelegatedPkpInfo> {
    try {
      const pkpOrNull = await handleSelectPkpForDelegatee(lawCli.delegatee!);
      if (pkpOrNull === null) {
        await LawCli.handleDelegateeMenu(lawCli);
      }
      return pkpOrNull as DelegatedPkpInfo;
    } catch (error) {
      if (error instanceof LawCliError) {
        if (
          error.type === DelegateeErrors.DELEGATEE_SELECTION_CANCELLED ||
          error.type === DelegateeErrors.NO_DELEGATED_PKPS
        ) {
          await LawCli.handleDelegateeMenu(lawCli);
        }
      }
      throw error;
    }
  }

  private static async handleCliSettingsMenu(lawCli: LawCli) {
    const cliSettingsOption = await handleCliSettingsMenu();

    switch (cliSettingsOption) {
      case CliSettingsMenuChoice.ChangeLitNetwork:
        await handleChangeLitNetwork(lawCli.localStorage);

        // Return to the CLI settings menu after changing the Lit network
        await LawCli.handleCliSettingsMenu(lawCli);
        break;
      case CliSettingsMenuChoice.ManageRpcs:
        await LawCli.handleManageRpcsMenu(lawCli);
        break;
      case CliSettingsMenuChoice.Back:
        await LawCli.showMainMenu(lawCli);
        break;
    }
  }

  private static async handleManageRpcsMenu(lawCli: LawCli) {
    const manageRpcsOption = await handleManageRpcsMenu();

    switch (manageRpcsOption) {
      case ManageRpcsMenuChoice.AddRpc:
        await handleAddRpc(lawCli.localStorage);

        // Return to the manage RPCs menu after
        await LawCli.handleManageRpcsMenu(lawCli);
        break;
      case ManageRpcsMenuChoice.EditRpc:
        await handleEditRpc(lawCli.localStorage);

        // Return to the manage RPCs menu after
        await LawCli.handleManageRpcsMenu(lawCli);
        break;
      case ManageRpcsMenuChoice.RemoveRpc:
        await handleRemoveRpc(lawCli.localStorage);

        // Return to the manage RPCs menu after
        await LawCli.handleManageRpcsMenu(lawCli);
        break;
      case ManageRpcsMenuChoice.Back:
        await LawCli.handleCliSettingsMenu(lawCli);
        break;
    }
  }

  private static async handleAdminMenu(lawCli: LawCli, pkp?: PkpInfo) {
    // TODO I don't think this is needed since options other than AdminSettings
    // are not available if an Admin is not configured.
    // If an instance of Admin is not provided, prompt the user to configure an Admin signer
    // if (admin === undefined) {
    //   const adminPrivateKey = lawCli.localStorage.getItem(
    //     StorageKeys.ADMIN_PRIVATE_KEY
    //   );

    //   if (adminPrivateKey) {
    //     admin = await Admin.create(lawCli.litNetwork, adminPrivateKey);
    //   }
    // }

    const option = await handleAdminMenu(lawCli.admin!, pkp);

    switch (option) {
      case AdminMenuChoice.AdminSettings:
        await LawCli.handleAdminSettingsMenu(lawCli);
        break;
      case AdminMenuChoice.SelectPkp: {
        const selectedPkp = await LawCli.handleSelectPkp(lawCli);
        await LawCli.handleAdminMenu(lawCli, selectedPkp);
        break;
      }
      case AdminMenuChoice.ManageTools:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectPkp(lawCli);
        }
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case AdminMenuChoice.ManagePolicies:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectPkp(lawCli);
        }
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case AdminMenuChoice.ManageDelegatees:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectPkp(lawCli);
        }
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case AdminMenuChoice.Back:
        await LawCli.showMainMenu(lawCli);
        break;
    }
  }

  private static async handleAdminSettingsMenu(lawCli: LawCli) {
    const option = await handleAdminSettingsMenu();

    switch (option) {
      case AdminSettingsMenuChoice.ConfigureSigner: {
        await LawCli.handleAdminConfigureSignerMenu(lawCli);
        break;
      }
      case AdminSettingsMenuChoice.Back:
        await LawCli.handleAdminMenu(lawCli);
        break;
    }
  }

  private static async handleAdminConfigureSignerMenu(lawCli: LawCli) {
    const signerOption = await handleConfigureAdminSignerMenu();

    switch (signerOption) {
      case AdminConfigureSignerMenuChoice.UseEoa: {
        lawCli.admin = await handleUseEoaForAdmin(lawCli.localStorage);
        await LawCli.handleAdminMenu(lawCli);
        break;
      }
      case AdminConfigureSignerMenuChoice.UseMultiSig:
        break;
      case AdminConfigureSignerMenuChoice.UsePkp:
        break;
      case AdminConfigureSignerMenuChoice.Back:
        await LawCli.handleAdminSettingsMenu(lawCli);
        break;
    }
  }

  private static async handleManageToolsMenu(lawCli: LawCli, pkp: PkpInfo) {
    const option = await handleManageToolsMenu();

    switch (option) {
      case ManageToolsMenuChoice.GetRegisteredTools:
        await handleGetTools(lawCli.admin!, pkp);
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case ManageToolsMenuChoice.PermitTool:
        await handlePermitTool(lawCli.admin!, pkp);
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case ManageToolsMenuChoice.RemoveTool:
        await handleRemoveTool(lawCli.admin!, pkp);
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case ManageToolsMenuChoice.EnableTool:
        await handleEnableTool(lawCli.admin!, pkp);
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case ManageToolsMenuChoice.DisableTool:
        await handleDisableTool(lawCli.admin!, pkp);
        await LawCli.handleManageToolsMenu(lawCli, pkp);
        break;
      case ManageToolsMenuChoice.Back:
        await LawCli.handleAdminMenu(lawCli);
        break;
    }
  }

  private static async handleManagePoliciesMenu(lawCli: LawCli, pkp: PkpInfo) {
    const option = await handleManagePoliciesMenu();

    switch (option) {
      case ManagePoliciesMenuChoice.GetAllPolicies:
        await handleGetPolicies(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.GetToolPolicy:
        await handleGetToolPolicy(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.SetPolicy:
        await handleSetPolicy(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.RemovePolicy:
        await handleRemovePolicy(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.EnablePolicy:
        await handleEnablePolicy(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.DisablePolicy:
        await handleDisablePolicy(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.GetPolicyParameter:
        await handleGetToolPolicyParameter(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.SetPolicyParameter:
        await handleSetToolPolicyParameter(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.RemovePolicyParameter:
        await handleRemoveToolPolicyParameter(lawCli.admin!, pkp);
        await LawCli.handleManagePoliciesMenu(lawCli, pkp);
        break;
      case ManagePoliciesMenuChoice.Back:
        await LawCli.handleAdminMenu(lawCli);
        break;
    }
  }

  private static async handleManageDelegateesMenu(
    lawCli: LawCli,
    pkp: PkpInfo
  ) {
    const option = await handleManageDelegateesMenu();

    switch (option) {
      case ManageDelegateesMenuChoice.GetDelegatees:
        await handleGetDelegatees(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.IsDelegatee:
        await handleIsDelegatee(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.AddDelegatee:
        await handleAddDelegatee(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.RemoveDelegatee:
        await handleRemoveDelegatee(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.PermitTool:
        await handlePermitToolForDelegatee(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.UnpermitTool:
        await handleUnpermitToolForDelegatee(lawCli.admin!, pkp);
        await LawCli.handleManageDelegateesMenu(lawCli, pkp);
        break;
      case ManageDelegateesMenuChoice.Back:
        await LawCli.handleAdminMenu(lawCli);
        break;
    }
  }

  private static async handleDelegateeMenu(
    lawCli: LawCli,
    pkp?: DelegatedPkpInfo
  ) {
    const option = await handleDelegateeMenu(lawCli.delegatee, pkp);

    switch (option) {
      case DelegateeMenuChoice.DelegateeSettings:
        await LawCli.handleDelegateeSettingsMenu(lawCli);
        break;
      case DelegateeMenuChoice.SelectPkp: {
        const selectedPkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        await LawCli.handleDelegateeMenu(lawCli, selectedPkp);
        break;
      }
      case DelegateeMenuChoice.GetDelegatedPkps:
        await handleGetDelegatedPkps(lawCli.delegatee!);
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.GetRegisteredTools:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        }
        await handleGetRegisteredTools(lawCli.delegatee!, pkp);
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.GetToolPolicy:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        }
        await handleGetToolPolicyForDelegatee(lawCli.delegatee!, pkp);
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.GetToolViaIntent:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        }

        if (lawCli.delegatee!.intentMatcher === null) {
          const intentMatcher = await handleGetIntentMatcher(lawCli.delegatee!);
          lawCli.delegatee!.setIntentMatcher(intentMatcher);
        }

        await handleGetToolViaIntent(lawCli.delegatee!, pkp);
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.ExecuteToolViaIntent:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        }

        if (lawCli.delegatee!.intentMatcher === null) {
          const intentMatcher = await handleGetIntentMatcher(lawCli.delegatee!);
          lawCli.delegatee!.setIntentMatcher(intentMatcher);
        }

        await handleExecuteToolViaIntent(
          lawCli.localStorage,
          lawCli.delegatee!,
          pkp
        );
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.ExecuteTool:
        if (pkp === undefined) {
          pkp = await LawCli.handleSelectDelegatedPkp(lawCli);
        }
        await handleExecuteTool(lawCli.localStorage, lawCli.delegatee!, pkp);
        await LawCli.handleDelegateeMenu(lawCli, pkp);
        break;
      case DelegateeMenuChoice.Back:
        await LawCli.showMainMenu(lawCli);
        break;
    }
  }

  private static async handleDelegateeSettingsMenu(lawCli: LawCli) {
    const option = await handleDelegateeSettingsMenu();

    switch (option) {
      case DelegateeSettingsMenuChoice.ConfigureSigner:
        await LawCli.handleConfigureDelegateeSignerMenu(lawCli);
        break;
      case DelegateeSettingsMenuChoice.Back:
        await LawCli.handleDelegateeMenu(lawCli);
        break;
    }
  }

  private static async handleConfigureDelegateeSignerMenu(lawCli: LawCli) {
    const signerOption = await handleConfigureDelegateeSignerMenu();

    switch (signerOption) {
      case DelegateeConfigureSignerMenuChoice.UseEoa:
        lawCli.delegatee = await handleUseEoaForDelegatee(lawCli.localStorage);
        await LawCli.handleDelegateeMenu(lawCli);
        break;
      case DelegateeConfigureSignerMenuChoice.UsePkp:
        break;
      case DelegateeConfigureSignerMenuChoice.Back:
        await LawCli.handleDelegateeSettingsMenu(lawCli);
        break;
    }
  }

  public static async start() {
    const localStorage = LawCli.initStorage();
    const litNetwork = await getLitNetwork(localStorage);
    const lawCli = new LawCli(localStorage, litNetwork);

    await LawCli.showMainMenu(lawCli);
  }
}

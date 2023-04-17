import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
  WorkspaceLeaf,
} from 'obsidian';

import { FolderSuggest } from 'src/settings/folderSuggester';

interface LeafStatus {
  leaf: WorkspaceLeaf;
  status: 'new' | 'loaded';
}
interface NewNoteNewWindowSettings {
  openInLastFloatingWindow: boolean;
  useDefaultFolder: boolean;
  customFolder: string;
}

const DEFAULT_SETTINGS: NewNoteNewWindowSettings = {
  openInLastFloatingWindow: true,
  useDefaultFolder: true,
  customFolder: '/',
};

export default class NewNoteNewWindow extends Plugin {
  settings: NewNoteNewWindowSettings;

  leaves: LeafStatus[] = [];

  async onload() {
    await this.loadSettings();

    const trackClose = (leafStatus: LeafStatus) => {
      this.registerInterval(
        window.setInterval(() => {
          if (
            leafStatus.status == 'loaded' &&
            leafStatus.leaf.getViewState().type == 'empty'
          ) {
            this.leaves = this.leaves.filter((l) => l.leaf != leafStatus.leaf);
            leafStatus.leaf.detach();
          }
        }, 10)
      );
    };

    const createLeaf = (where: 'new-window' | 'same-window') => {
      let leaf: WorkspaceLeaf | undefined = undefined;

      if (!this.leaves.length) {
        leaf = this.app.workspace.getLeaf('window');
      } else {
        if (where == 'same-window') {
          let lastLeafStatus = this.leaves[this.leaves.length - 1];
          this.app.workspace.setActiveLeaf(lastLeafStatus.leaf);
          leaf = this.app.workspace.getLeaf('tab');
        } else {
          leaf = this.app.workspace.getLeaf('window');
        }
      }
      const newLeafStatus: LeafStatus = { leaf, status: 'new' };

      trackClose(newLeafStatus);
      this.leaves.push(newLeafStatus);
      return newLeafStatus;
    };

    this.addCommand({
      id: 'nnnw-create-new-note-in-window',
      name: 'Create note in Window',
      icon: 'popup-open',
      callback: async () => {
        let fileName = this.generateNewFileNameInFolder();
        let nleafStatus = this.settings.openInLastFloatingWindow
          ? createLeaf('same-window')
          : createLeaf('new-window');
        const newFile = await this.app.vault.create(fileName, '', {});
        await nleafStatus.leaf.openFile(newFile);
        nleafStatus.status = 'loaded';
      },
    });

    this.addSettingTab(new SettingTab(this.app, this));
  }

  private getFileParent() {
    if (!this.settings.useDefaultFolder) {
      let folder = this.settings.customFolder;
      const abstractFile = this.app.vault.getAbstractFileByPath(folder);
      if (abstractFile && 'children' in (abstractFile as TFolder)) {
        return abstractFile as TFolder;
      } else {
        new Notice(`Error opening folder '${folder}'!`);
        throw new Error(`Could not open the folder at '${folder}'`);
      }
    }

    let lastFile = this.app.workspace.getActiveFile();
    let path = !!lastFile ? lastFile.path : '';
    return this.app.fileManager.getNewFileParent(path);
  }

  private generateNewFileNameInFolder() {
    const tfolder = this.getFileParent();

    let newFilePath = tfolder.path;
    let untitleds = tfolder.children
      .filter((c) => c.name.startsWith('Untitled'))
      .map((c) => c.name);

    let fileName = '';
    for (let i = 0; i <= untitleds.length; i++) {
      fileName = `Untitled${i > 0 ? ' ' + (i + 1) : ''}.md`;
      if (!untitleds.includes(fileName)) {
        break;
      }
    }
    return `${newFilePath}/${fileName}`;
  }

  onunload() {
    this.leaves = [];
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SettingTab extends PluginSettingTab {
  plugin: NewNoteNewWindow;

  constructor(app: App, plugin: NewNoteNewWindow) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', {
      text: `${this.plugin.manifest.name} ${this.plugin.manifest.version}`,
    });

    new Setting(containerEl)
      .setName('Reuse the same floating window.')
      .setDesc('If true new notes will open in the same floating window.')
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.openInLastFloatingWindow);
        cb.onChange(async (value) => {
          this.plugin.settings.openInLastFloatingWindow = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Use the default folder.')
      .setDesc(
        "Create the new files in the default folder as per Obsidian's configuration."
      )
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.useDefaultFolder);
        cb.onChange(async (value) => {
          folderSetting.settingEl.style.display = value ? 'none' : 'block';
          this.plugin.settings.useDefaultFolder = value;
          await this.plugin.saveSettings();
        });
      });

    const folderSetting = new Setting(this.containerEl)
      .setName('Template folder location')
      .setDesc('Files in this folder will be available as templates.')
      .addSearch((cb) => {
        new FolderSuggest(cb.inputEl);
        cb.setPlaceholder('Example: folder1/folder2')
          .setValue(this.plugin.settings.customFolder)
          .onChange((new_folder) => {
            this.plugin.settings.customFolder = new_folder;
            this.plugin.saveSettings();
          });
        // // @ts-ignore
        // cb.containerEl.addClass('templater_search');
      });
    folderSetting.settingEl.style.display = this.plugin.settings
      .useDefaultFolder
      ? 'none'
      : 'block';

    containerEl.createEl('hr');
    const div1 = containerEl.createEl('div', {
      text: 'Developed by ',
    });
    div1.createEl('a', {
      text: `Pr0dt0s`,
      href: `https://github.com/Pr0dt0s`,
    });
    div1.appendText(' & ');
    div1.createEl('a', {
      text: `Brainflurry`,
      href: `http://brainflurry.com/`,
    });
    containerEl.createEl('br');
    const div2 = containerEl.createEl('div', {
      text: 'If you want to see the documentation, submit a bug, or a feature request you can do so ',
    });
    div2.createEl('a', {
      text: 'here',
      href: 'https://github.com/Pr0dt0s/new-note-new-window',
    });
    div2.appendText('.');
  }
}

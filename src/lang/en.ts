const en = {
	appName: 'Tags',
	openTagManager: 'Open tag manager',
	searchPlaceholder: 'Search tags...',

	// Toolbar
	sortByNameAsc: 'Sort by name: A → Z',
	sortByNameDesc: 'Sort by name: Z → A',
	sortByFrequencyAsc: 'Sort by frequency: Low → High',
	sortByFrequencyDesc: 'Sort by frequency: High → Low',

	expandAll: 'Expand all groups',
	collapseAll: 'Collapse all groups',
	enterMultiSelect: 'Enter multi-select mode',
	exitMultiSelect: (count: number) =>
		`Exit multi-select mode (${count} selected)`,

	addGroup: 'Add group',

	// Groups
	ungrouped: 'Ungrouped',

	lockGroup: 'Lock group',
	unlockGroup: 'Unlock group',

	// Tag menu
	removeFromGroup: 'Remove from current group',
	renameTag: 'Rename',
	manageGroups: 'Manage groups',
	selectedTagsCount: (count: number) =>
		`${count} tag(s) selected`,
	addToGroup: 'Add to group',
	createGroupFromSelected: 'Create group from selected',
	clearSelection: 'Clear selection',
	moveToGroup: 'Move to group',

	// Group menu
	renameGroup: 'Rename',
	deleteGroup: 'Delete',

	// Block
	moveBlock: 'Move block',
	createBlock: 'Drop here to create a new block',
	blockCreated: (tag: string) =>
		`Created a new block with #${tag}`,

	// Dialogs
	createGroupTitle: 'Create group',
	renameGroupTitle: 'Rename group',
	renameTagTitle: 'Rename tag',
	renameTagPrompt: (tag: string) => `Rename #${tag} to:`,
	groupNamePlaceholder: 'Group name',
	newTagNamePlaceholder: 'New tag name',
	cancel: 'Cancel',
	create: 'Create',
	rename: 'Rename',
	confirmDeleteGroup: (group: string) =>
		`Delete group "${group}"?\n\nTags will not be deleted from your vault.`,

	// Notices
	tagAdded: (tag: string, group: string) =>
		`Added #${tag} to ${group}`,

	tagRemoved: (tag: string, group: string) =>
		`Removed #${tag} from ${group}`,

	tagMoved: (tag: string, group: string) =>
		`Moved #${tag} to ${group}`,

	selectedTagsAdded: (count: number, group: string) =>
		`Added ${count} tag(s) to ${group}`,

	selectedTagsRemoved: (count: number, group: string) =>
		`Removed ${count} tag(s) from ${group}`,

	selectedTagsMoved: (
		count: number,
		sourceGroup: string,
		targetGroup: string,
	) => `Moved ${count} tag(s) from ${sourceGroup} to ${targetGroup}`,

	groupCreated: (group: string) =>
		`Created group: ${group}`,

	groupDeleted: (group: string) =>
		`Deleted group: ${group}`,

	groupAlreadyExists: (group: string) =>
		`Group "${group}" already exists.`,

	invalidTagName: 'Tag names cannot contain spaces.',

	tagRenamed: (oldTag: string, newTag: string, fileCount: number) =>
		`Renamed #${oldTag} to #${newTag} in ${fileCount} file(s).`,
};

export default en;

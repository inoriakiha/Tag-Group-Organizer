const zh = {
	appName: '标签',
	openTagManager: '打开标签管理器',
	searchPlaceholder: '搜索标签...',

	// Toolbar
	sortByNameAsc: '按名称排序：A → Z',
	sortByNameDesc: '按名称排序：Z → A',
	sortByFrequencyAsc: '按频次排序：低 → 高',
	sortByFrequencyDesc: '按频次排序：高 → 低',

	expandAll: '展开全部分组',
	collapseAll: '折叠全部分组',
	enterMultiSelect: '开启多选模式',
	exitMultiSelect: (count: number) =>
		`退出多选模式（已选 ${count} 个标签）`,

	addGroup: '添加分组',

	// Groups
	ungrouped: '未分组',

	lockGroup: '锁定分组',
	unlockGroup: '解锁分组',

	// Tag menu
	removeFromGroup: '移除当前分组',
	renameTag: '重命名',
	manageGroups: '管理分组',
	selectedTagsCount: (count: number) =>
		`已选择 ${count} 个标签`,
	addToGroup: '添加到分组',
	createGroupFromSelected: '从所选标签创建分组',
	clearSelection: '清除选择',
	moveToGroup: '移动到分组',

	// Group menu
	renameGroup: '重命名',
	deleteGroup: '删除分组',

	// Block
	createBlock: '拖到这里创建新块',
	blockCreated: (tag: string) =>
		`已使用 #${tag} 创建新块`,

	// Dialogs
	createGroupTitle: '创建分组',
	renameGroupTitle: '重命名分组',
	renameTagTitle: '重命名标签',
	renameTagPrompt: (tag: string) => `将 #${tag} 重命名为：`,
	groupNamePlaceholder: '分组名称',
	newTagNamePlaceholder: '新标签名称',
	cancel: '取消',
	create: '创建',
	rename: '重命名',
	confirmDeleteGroup: (group: string) =>
		`确定删除分组“${group}”吗？\n\n不会删除仓库中的标签。`,

	// Notices
	tagAdded: (tag: string, group: string) =>
		`已将 #${tag} 添加到 ${group}`,

	tagRemoved: (tag: string, group: string) =>
		`已将 #${tag} 从 ${group} 移除`,

	tagMoved: (tag: string, group: string) =>
		`已将 #${tag} 移动到 ${group}`,

	selectedTagsAdded: (count: number, group: string) =>
		`已将 ${count} 个标签添加到 ${group}`,

	selectedTagsRemoved: (count: number, group: string) =>
		`已从 ${group} 移除 ${count} 个标签`,

	selectedTagsMoved: (
		count: number,
		sourceGroup: string,
		targetGroup: string,
	) => `已将 ${count} 个标签从 ${sourceGroup} 移动到 ${targetGroup}`,

	groupCreated: (group: string) =>
		`已创建分组：${group}`,

	groupDeleted: (group: string) =>
		`已删除分组：${group}`,

	groupAlreadyExists: (group: string) =>
		`分组“${group}”已存在。`,

	invalidTagName: '标签名称不能包含空格。',

	tagRenamed: (oldTag: string, newTag: string, fileCount: number) =>
		`已在 ${fileCount} 个文件中将 #${oldTag} 重命名为 #${newTag}。`,
};

export default zh;

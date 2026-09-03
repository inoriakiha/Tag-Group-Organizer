import {
	App,
	ItemView,
	Menu,
	Modal,
	Notice,
	Platform,
	Plugin,
	WorkspaceLeaf,
	getLanguage,
	setIcon,
} from 'obsidian';

import en from './lang/en';
import zh from './lang/zh';

type Language = typeof en;

function getCurrentLanguage(): Language {
	return getLanguage().startsWith('zh')
		? zh
		: en;
}

const VIEW_TYPE_TAG_MANAGER = 'tag-manager-view';
const MOBILE_LONG_PRESS_DELAY_MS = 550;
const MOBILE_LONG_PRESS_MOVE_THRESHOLD_PX = 10;
const MOBILE_LONG_PRESS_SUPPRESSION_MS = 800;

interface TagBlock {
	id: string;
	tags: string[];
}

interface TagGroup {
	id: string;
	name: string;
	blocks: TagBlock[];
	collapsed: boolean;
	locked: boolean;
}

interface TagManagerData {
	groups: TagGroup[];
	version: number;

	sortBy:
	    | 'name'
		| 'frequency';

	nameSort:
		| 'asc'
		| 'desc';

	frequencySort:
		| 'asc'
		| 'desc';
}


const DEFAULT_DATA: TagManagerData = {
	version: 1,
	groups: [],
	sortBy: 'name',
	nameSort: 'asc',
	frequencySort: 'desc',
};

export default class TagManagerPlugin extends Plugin {
	data: TagManagerData = DEFAULT_DATA;

	async onload() {
		const t = getCurrentLanguage();
		const savedData = await this.loadData() as Partial<TagManagerData> | null;

		this.data = {
			...DEFAULT_DATA,
			...savedData,
			groups: savedData?.groups ?? [],
		};
		// 旧版本数据没有 version
	if (!this.data.version) {
		this.data.version = 1.0 ;
	}
		if (this.cleanGroupData()) {
			await this.saveDataToDisk();
		}



		this.registerView(
			VIEW_TYPE_TAG_MANAGER,
			(leaf) => new TagManagerView(leaf, this),
		);

		this.addCommand({
			id: 'open-tag-manager',
			name: t.openTagManager,
			callback: () => {
				void this.activateView();
			},
		});

		this.addRibbonIcon(
			'tags',
			t.openTagManager,
			() => {
				void this.activateView();
			},
		);

		this.registerEvent(
	this.app.metadataCache.on(
		'changed',
		() => {
			this.refreshView();
		},
	),
);

	}

private cleanGroupData(): boolean {
	let changed = false;

	for (const group of this.data.groups) {
		// ================================
		// 清理重复 Tag
		// ================================

		for (const block of group.blocks) {
			const uniqueTags = Array.from(
				new Set(block.tags),
			);

			if (
				uniqueTags.length !==
				block.tags.length
			) {
				block.tags = uniqueTags;
				changed = true;
			}
		}

		// ================================
		// 清理空 Block
		// ================================

		const nonEmptyBlocks =
			group.blocks.filter(
				(block) =>
					block.tags.length > 0,
			);

		if (
			nonEmptyBlocks.length !==
			group.blocks.length
		) {
			group.blocks = nonEmptyBlocks;
			changed = true;
		}

		// ================================
		// Group 至少保留一个 Block
		// ================================

		if (group.blocks.length === 0) {
			group.blocks.push({
				id: crypto.randomUUID(),
				tags: [],
			});

			changed = true;
		}
	}

	return changed;
}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null | undefined = workspace.getLeavesOfType(
			VIEW_TYPE_TAG_MANAGER,
		)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);

			if (!leaf) {
				return;
			}

			await leaf.setViewState({
				type: VIEW_TYPE_TAG_MANAGER,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}

	refreshView() {
	const leaves =
		this.app.workspace.getLeavesOfType(
			VIEW_TYPE_TAG_MANAGER,
		);

	for (const leaf of leaves) {
		const view =
			leaf.view;

		if (view instanceof TagManagerView) {
			view.refresh();
		}
	}
}

	async saveDataToDisk() {
		await this.saveData(this.data);
	}
}

class TagManagerView extends ItemView {
	plugin: TagManagerPlugin;
	t: Language;

	constructor(
		leaf: WorkspaceLeaf,
		plugin: TagManagerPlugin,
	) {
		super(leaf);
		this.plugin = plugin;
		this.t = getCurrentLanguage();
	}

	getViewType(): string {
		return VIEW_TYPE_TAG_MANAGER;
	}

	getDisplayText(): string {
		return this.t.appName;
	}

	getIcon(): string {
		return 'tags';
	}

	async onOpen() {
		this.render();
	}
	refresh() {
	this.render();
}

	async onClose() {
		this.contentEl.empty();
	}


private sortTags(
	tags: string[],
	allTags: Map<string, number>,
): string[] {
	return [...tags].sort((a, b) => {
		// ================================
		// 名称排序
		// ================================
		if (this.plugin.data.sortBy === 'name') {
			return this.plugin.data.nameSort === 'asc'
				? a.localeCompare(b)
				: b.localeCompare(a);
		}

		// ================================
		// 频次排序
		// ================================
		const countA = allTags.get(a) ?? 0;
		const countB = allTags.get(b) ?? 0;

		// 频次不同 → 按频次
		if (countA !== countB) {
			return this.plugin.data.frequencySort === 'asc'
				? countA - countB
				: countB - countA;
		}

		// 频次相同 → 按名称（根据当前名称排序方向）
		const nameSort = this.plugin.data.nameSort;
		return nameSort === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
	});
}


	/*获取 Vault 中所有真实存在的 Tag*/
private getAllTags(): Map<string, number> {
	const tagCounts = new Map<string, number>();

	for (const file of this.app.vault.getMarkdownFiles()) {
		const cache =
			this.app.metadataCache.getFileCache(file);

		if (!cache) {
			continue;
		}

		// 当前文件里的所有 Tag
		// 使用 Set 保证同一个文件里的同一个 Tag 只计算一次
		const fileTags = new Set<string>();

		// ① 正文里的 #tag
		if (cache.tags) {
			for (const tag of cache.tags) {
				fileTags.add(
					tag.tag.replace(/^#/, ''),
				);
			}
		}

		// ② YAML / Frontmatter 里的 tags
		const frontmatter =
			cache.frontmatter;

		if (frontmatter) {
			const yamlTags: unknown =
				(frontmatter as Record<string, unknown>).tags;

			if (Array.isArray(yamlTags)) {
				for (const tag of yamlTags) {
					if (typeof tag === 'string') {
						fileTags.add(
							tag.replace(/^#/, ''),
						);
					}
				}
			} else if (
				typeof yamlTags === 'string'
			) {
				fileTags.add(
					yamlTags.replace(/^#/, ''),
				);
			}
		}

		// 一个文件里的同一个 Tag 只计算一次
		for (const tag of fileTags) {
			tagCounts.set(
				tag,
				(tagCounts.get(tag) ?? 0) + 1,
			);
		}
	}

	return tagCounts;
}


private getGroupFrequency(
	group: TagGroup,
	allTags: Map<string, number>,
): number {
	let frequency = 0;

	for (const block of group.blocks) {
		for (const tag of block.tags) {
		frequency += allTags.get(tag) ?? 0;
	}
}

	return frequency;
}


	/*获取目前没有任何分组的 Tag */
private getUngroupedTags(
	allTags: Map<string, number>,
): string[] {
	const groupedTags = new Set<string>();

	// 收集所有已经属于某个自定义分组的 Tag
	for (const group of this.plugin.data.groups) {
		for (const block of group.blocks) {
			for (const tag of block.tags) {
			groupedTags.add(tag);
		}
	}
}

	// Map → Tag 数组
	// 只保留没有出现在任何自定义分组里的 Tag
	return Array.from(allTags.keys()).filter(
		(tag) => !groupedTags.has(tag),
	);
 }


  private render() {
	const { contentEl } = this;

	contentEl.empty();

	// 整个 Tag Pane 的容器
	const container = contentEl.createDiv({
		cls: 'tag-manager-groups',
	});

	// ================================
	// Toolbar
	// ================================

	const toolbar = container.createDiv({
		cls: 'tag-manager-toolbar',
	});

	// ① 名称排序
	const nameSortBtn = toolbar.createEl(
		'button',
		{
			cls: 'clickable-icon',
		},
	);


setIcon(
	nameSortBtn,
	this.plugin.data.nameSort === 'asc'
		? 'arrow-up-az'
		: 'arrow-down-za',
);

nameSortBtn.setAttribute(
	'aria-label',
	this.plugin.data.nameSort === 'asc'
		? this.t.sortByNameAsc
		: this.t.sortByNameDesc,
);

nameSortBtn.onclick = async () => {
	// 切换为名称排序
	this.plugin.data.sortBy = 'name';

	// 如果当前已经是名称排序，
	// 再点击才切换方向
	if (this.plugin.data.nameSort === 'asc') {
		this.plugin.data.nameSort = 'desc';
	} else {
		this.plugin.data.nameSort = 'asc';
	}

	await this.plugin.saveDataToDisk();
	this.render();
};



	// ② 频次排序
	const frequencySortBtn =
		toolbar.createEl('button', {
			cls: 'clickable-icon',
		});


setIcon(
	frequencySortBtn,
	this.plugin.data.frequencySort === 'asc'
		? 'arrow-up-narrow-wide'
		: 'arrow-down-wide-narrow',
);

frequencySortBtn.setAttribute(
	'aria-label',
	this.plugin.data.frequencySort === 'asc'
		? this.t.sortByFrequencyAsc
		: this.t.sortByFrequencyDesc,
);

frequencySortBtn.onclick = async () => {
	// 切换为频次排序
	this.plugin.data.sortBy = 'frequency';

	// 如果当前已经是频次排序，
	// 再点击才切换方向
	if (
		this.plugin.data.frequencySort === 'asc'
	) {
		this.plugin.data.frequencySort = 'desc';
	} else {
		this.plugin.data.frequencySort = 'asc';
	}

	await this.plugin.saveDataToDisk();
	this.render();
};


	// ③ 全部展开 / 折叠
	const collapseBtn =
		toolbar.createEl('button', {
			cls: 'clickable-icon',
			attr: {
				'aria-label':
					this.plugin.data.groups.every(
			(group) => group.collapsed,
		)
			? this.t.expandAll
			: this.t.collapseAll,
			},
		});

	const allCollapsed =
		this.plugin.data.groups.length > 0 &&
		this.plugin.data.groups.every(
			(group) => group.collapsed,
		);

	setIcon(
		collapseBtn,
		allCollapsed
			? 'chevrons-down-up'
			: 'chevrons-up-down',
	);

	collapseBtn.onclick = async () => {
		const shouldCollapse =
			!this.plugin.data.groups.every(
				(group) => group.collapsed,
			);

		for (const group of this.plugin.data.groups) {
			group.collapsed =
				shouldCollapse;
		}

		await this.plugin.saveDataToDisk();
		this.render();
	};

	// ④ 添加分组
	const addGroupBtn =
		toolbar.createEl('button', {
			cls: 'clickable-icon',
			attr: {
				'aria-label': this.t.addGroup,
			},
		});

	setIcon(addGroupBtn, 'plus');

	addGroupBtn.onclick = () => {
		this.createGroup();
	};

	// ================================
	// 搜索
	// ================================

	const search = container.createEl(
		'input',
		{
			type: 'search',
			placeholder: this.t.searchPlaceholder,
			cls: 'tag-manager-search',
		},
	);

	// ================================
	// 获取所有 Tag
	// ================================

	const allTags = this.getAllTags();

	// ================================
	// 未分组
	// 永远放在最上面，不参与 Group 排序
	// ================================

	const ungroupedTags =
		this.getUngroupedTags(allTags);

	if (ungroupedTags.length > 0) {
		this.renderUngrouped(
			container,
			ungroupedTags,
			allTags,
		);
	}

	// ================================
	// Groups
	// ================================

	let groups = [
		...this.plugin.data.groups,
	];
	for (const group of this.plugin.data.groups) {
		group.locked ??= false;
	}

// ================================
// Group 排序
// ================================

if (this.plugin.data.sortBy === 'name') {
	groups.sort((a, b) => {
		return this.plugin.data.nameSort === 'asc'
			? a.name.localeCompare(b.name)
			: b.name.localeCompare(a.name);
	});
} else {
	groups.sort((a, b) => {
		const countA =
			this.getGroupFrequency(a, allTags);

		const countB =
			this.getGroupFrequency(b, allTags);

		if (countA !== countB) {
			return this.plugin.data.frequencySort === 'asc'
				? countA - countB
				: countB - countA;
		}

		// 频次相同 → 名称 A-Z
		return a.name.localeCompare(b.name);
	});
}


	// 渲染 Groups
	for (const group of groups) {
		this.renderGroup(
			container,
			group,
			allTags,
		);
	}

	// ================================
	// 搜索过滤
	// ================================

	search.addEventListener(
		'input',
		() => {
			this.filterTags(
				container,
				search.value
					.trim()
					.toLowerCase(),
			);
		},
	);
}



private renderGroup(
	container: HTMLElement,
	group: TagGroup,
	allTags: Map<string, number>,
) {
	const groupEl = container.createDiv({
		cls: 'tag-manager-group',
	});

	const header = groupEl.createDiv({
		cls: 'tag-manager-group-header',
	});

	// 拖拽到 Group
header.addEventListener(
	'dragover',
	(event: DragEvent) => {
		// 已锁定的 Group 不接受 Tag
		if (group.locked) {
			return;
		}

		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect =
				'copy';
		}

		header.addClass(
			'tag-manager-group-drag-over',
		);
	},
);


	header.addEventListener(
		'dragleave',
		() => {
			header.removeClass(
				'tag-manager-group-drag-over',
			);
		},
	);

	header.addEventListener(
		'drop',
		(event: DragEvent) => {
			void (async () => {
			// 已锁定的 Group 不接受 Tag
			if (group.locked) {
				return;
				}
			event.preventDefault();

			header.removeClass(
				'tag-manager-group-drag-over',
			);

			const tag =
				event.dataTransfer?.getData(
					'application/x-tag-manager-tag',
				);

			if (!tag) {
				return;
			}

// 默认加入第一个 Block
const firstBlock = group.blocks[0];

if (!firstBlock) {
	return;
}

const alreadyExists =
	group.blocks.some((block) =>
		block.tags.includes(tag),
	);

if (!alreadyExists) {
	firstBlock.tags.push(tag);

	await this.plugin.saveDataToDisk();

	this.render();

	new Notice(
		this.t.tagAdded(tag, group.name),
	);
}


			})();
		},
	);

	// 折叠箭头
	const chevron = header.createSpan({
		cls: 'tag-manager-group-chevron',
	});

	setIcon(
		chevron,
		group.collapsed
			? 'chevron-right'
			: 'chevron-down',
	);

	// Group 名称
header.createSpan({
	text: group.name,
	cls: 'tag-manager-group-name',
});

// 锁定按钮
const lockBtn = header.createSpan({
	cls: 'tag-manager-group-lock',
});

setIcon(
	lockBtn,
	group.locked ? 'lock' : 'unlock',
);

lockBtn.setAttribute(
	'aria-label',
	group.locked
		? this.t.unlockGroup
		: this.t.lockGroup,
);

lockBtn.onclick = async (event) => {
	// 防止触发 Header 的折叠
	event.stopPropagation();

	group.locked = !group.locked;

	await this.plugin.saveDataToDisk();

	this.render();
};



	// Group 中实际存在的 Tag 数量

const visibleTags: string[] = [];

for (const block of group.blocks) {
	for (const tag of block.tags) {
		if (allTags.has(tag)) {
			visibleTags.push(tag);
		}
	}
}



	header.createSpan({
		text: String(visibleTags.length),
		cls: 'tag-manager-group-count',
	});

	// 左键：折叠 / 展开
	header.onclick = async () => {
		group.collapsed =
			!group.collapsed;

		await this.plugin.saveDataToDisk();
		this.render();
	};

	// 右键：Group 菜单
	header.oncontextmenu = (
		event: MouseEvent,
	) => {
		event.preventDefault();

		this.showGroupMenu(
			group,
			event,
		);
	};

	if (group.collapsed) {
		return;
	}


// Block 容器
const blockContainer =
	groupEl.createDiv({
		cls: 'tag-manager-blocks',
	});


for (const block of group.blocks) {
	const visibleBlockTags =
		block.tags.filter((tag) =>
			allTags.has(tag),
		);

	const sortedBlockTags =
	this.sortTags(
		visibleBlockTags,
		allTags,
	);

	// 空 Block 暂时不显示
	if (visibleBlockTags.length === 0) {
		continue;
	}

	// 一个 Block
	const blockEl =
		blockContainer.createDiv({
			cls: 'tag-manager-block',
		});

	// Block 接收 Tag 拖拽
	blockEl.addEventListener(
		'dragover',
		(event: DragEvent) => {
			if (group.locked) {
				return;
			}

			event.preventDefault();

			if (event.dataTransfer) {
				event.dataTransfer.dropEffect =
					'copy';
			}

			blockEl.addClass(
				'tag-manager-block-drag-over',
			);
		},
	);

	blockEl.addEventListener(
		'dragleave',
		() => {
			blockEl.removeClass(
				'tag-manager-block-drag-over',
			);
		},
	);

	blockEl.addEventListener(
		'drop',
		(event: DragEvent) => {
			void (async () => {
			if (group.locked) {
				return;
			}

			event.preventDefault();

			blockEl.removeClass(
				'tag-manager-block-drag-over',
			);

			const tag =
				event.dataTransfer?.getData(
					'application/x-tag-manager-tag',
				);

			if (!tag) {
				return;
			}

const sourceGroupId =
	event.dataTransfer?.getData(
		'application/x-tag-manager-source-group',
	);

const sourceBlockId =
	event.dataTransfer?.getData(
		'application/x-tag-manager-source-block',
	);

const sourceGroup =
	this.plugin.data.groups.find(
		(g) => g.id === sourceGroupId,
	);

const sourceBlock =
	sourceGroup?.blocks.find(
		(b) => b.id === sourceBlockId,
	);

// 判断 Tag 是否已经存在于目标 Block
if (block.tags.includes(tag)) {
	return;
}

// 同一个 Group 内移动
if (
	sourceGroup &&
	sourceGroup.id === group.id
) {
	// 从原 Block 移除
	if (sourceBlock) {
		sourceBlock.tags =
			sourceBlock.tags.filter(
				(t) => t !== tag,
			);
	}

	// 加入目标 Block
	block.tags.push(tag);
}
// 跨 Group：复制到目标 Group
else {
	// 防止目标 Group 内已经存在
	const alreadyExists =
		group.blocks.some(
			(otherBlock) =>
				otherBlock.tags.includes(tag),
		);

	if (alreadyExists) {
		return;
	}

	block.tags.push(tag);
}

await this.plugin.saveDataToDisk();

this.render();

new Notice(
	this.t.tagMoved(tag, group.name),
);



			})();
		},
	);

	// Block 内的 Tag
	for (const tag of sortedBlockTags) {
		this.renderTag(
			blockEl,
			tag,
			allTags.get(tag) ?? 0,
			group,
			block,
		);
	}
}


// Group 最下面：创建新 Block 的 Drop Zone
if (!group.locked) {
	const newBlockZone =
		blockContainer.createDiv({
			cls: 'tag-manager-new-block-zone',
		});

	newBlockZone.createSpan({
		text: this.t.createBlock,
		cls: 'tag-manager-new-block-hint',
	});

	newBlockZone.addEventListener(
		'dragover',
		(event: DragEvent) => {
			event.preventDefault();

			if (event.dataTransfer) {
				event.dataTransfer.dropEffect =
					'copy';
			}

			newBlockZone.addClass(
				'tag-manager-new-block-drag-over',
			);
		},
	);

	newBlockZone.addEventListener(
		'dragleave',
		() => {
			newBlockZone.removeClass(
				'tag-manager-new-block-drag-over',
			);
		},
	);


newBlockZone.addEventListener(
	'drop',
	(event: DragEvent) => {
		void (async () => {
		event.preventDefault();
		event.stopPropagation();

		newBlockZone.removeClass(
			'tag-manager-new-block-drag-over',
		);

		const tag =
			event.dataTransfer?.getData(
				'application/x-tag-manager-tag',
			);

		if (!tag) {
			return;
		}

		const sourceGroupId =
			event.dataTransfer?.getData(
				'application/x-tag-manager-source-group',
			);

		const sourceBlockId =
			event.dataTransfer?.getData(
				'application/x-tag-manager-source-block',
			);

		const sourceGroup =
			this.plugin.data.groups.find(
				(g) => g.id === sourceGroupId,
			);

		const sourceBlock =
			sourceGroup?.blocks.find(
				(b) => b.id === sourceBlockId,
			);

		// 同一个 Group 内移动
		if (
			sourceGroup &&
			sourceGroup.id === group.id
		) {
			// 只有当 Tag 已经独占最后一个 Block 时，
			// 拖到末尾才不会产生任何结构变化。
			if (
				sourceBlock &&
				group.blocks[
					group.blocks.length - 1
				] === sourceBlock &&
				sourceBlock.tags.length === 1
			) {
				return;
			}

			// 从原 Block 移除
			if (sourceBlock) {
				sourceBlock.tags =
					sourceBlock.tags.filter(
						(t) => t !== tag,
					);

				// 移动独占 Block 的 Tag 后，删除留下的空 Block。
				if (sourceBlock.tags.length === 0) {
					group.blocks = group.blocks.filter(
						(block) => block.id !== sourceBlock.id,
					);
				}
			}
		}
		// 跨 Group
		else {
			const alreadyExists =
				group.blocks.some(
					(block) =>
						block.tags.includes(tag),
				);

			if (alreadyExists) {
				return;
			}
		}

		// 创建一个新的 Block
		group.blocks.push({
			id: crypto.randomUUID(),
			tags: [tag],
		});

		await this.plugin.saveDataToDisk();

		this.render();

		new Notice(
			this.t.blockCreated(tag),
		);
		})();
}
);
}
}

private renderUngrouped(
	container: HTMLElement,
	tags: string[],
	allTags: Map<string, number>,
) {
	const tagContainer = container.createDiv({
		cls: 'tag-manager-ungrouped-tags',
	});

	const sortedTags = this.sortTags(
		tags,
		allTags,
	);

	for (const tag of sortedTags) {
		this.renderTag(
			tagContainer,
			tag,
			allTags.get(tag) ?? 0,
		);
	}
}



private renderTag(
	container: HTMLElement,
	tag: string,
	count: number,
	sourceGroup?: TagGroup,
	sourceBlock?: TagBlock,
) {
	const tagEl = container.createDiv({
		cls: 'tag-manager-tag',
	});

	// Tag 名称
	tagEl.createSpan({
		text: tag,
		cls: 'tag-manager-tag-name',
	});

	// 使用次数
	tagEl.createSpan({
		text: String(count),
		cls: 'tag-manager-tag-count',
	});

	let longPressTimer: number | null = null;
	let activePointerId: number | null = null;
	let longPressStartX = 0;
	let longPressStartY = 0;
	let suppressInteractionUntil = 0;

	const cancelLongPress = () => {
		if (longPressTimer !== null) {
			window.clearTimeout(longPressTimer);
			longPressTimer = null;
		}

		activePointerId = null;
	};

	if (Platform.isMobile) {
		tagEl.addEventListener(
			'pointerdown',
			(event: PointerEvent) => {
				if (
					!event.isPrimary ||
					event.pointerType === 'mouse' ||
					event.button !== 0
				) {
					return;
				}

				cancelLongPress();
				activePointerId = event.pointerId;
				longPressStartX = event.clientX;
				longPressStartY = event.clientY;

				longPressTimer = window.setTimeout(() => {
					longPressTimer = null;

					if (
						activePointerId !== event.pointerId ||
						!tagEl.isConnected
					) {
						return;
					}

					activePointerId = null;
					suppressInteractionUntil =
						Date.now() + MOBILE_LONG_PRESS_SUPPRESSION_MS;

					this.showTagMenu(
						tag,
						new MouseEvent('contextmenu', {
							bubbles: true,
							cancelable: true,
							clientX: longPressStartX,
							clientY: longPressStartY,
							view: window,
						}),
						sourceGroup,
					);
				}, MOBILE_LONG_PRESS_DELAY_MS);
			},
		);

		tagEl.addEventListener(
			'pointermove',
			(event: PointerEvent) => {
				if (event.pointerId !== activePointerId) {
					return;
				}

				const deltaX = event.clientX - longPressStartX;
				const deltaY = event.clientY - longPressStartY;
				const movementSquared = deltaX ** 2 + deltaY ** 2;

				if (
					movementSquared >
					MOBILE_LONG_PRESS_MOVE_THRESHOLD_PX ** 2
				) {
					cancelLongPress();
				}
			},
		);

		for (const eventName of [
			'pointerup',
			'pointercancel',
			'lostpointercapture',
		]) {
			tagEl.addEventListener(eventName, cancelLongPress);
		}
	}

	// 让 Tag 可以被拖动
	tagEl.draggable = true;

	// 开始拖动
	tagEl.addEventListener(
		'dragstart',
		(event: DragEvent) => {
			cancelLongPress();

			if (!event.dataTransfer) {
				return;
			}

			// 给我们自己的分组拖拽逻辑使用
			event.dataTransfer.setData(
				'application/x-tag-manager-tag',
				tag,
			);
			// Tag 本身
			event.dataTransfer.setData(
				'application/x-tag-manager-tag',
				tag,
			);

// 记录来源 Group
if (sourceGroup) {
	event.dataTransfer.setData(
		'application/x-tag-manager-source-group',
		sourceGroup.id,
	);
}

// 记录来源 Block
if (sourceBlock) {
	event.dataTransfer.setData(
		'application/x-tag-manager-source-block',
		sourceBlock.id,
	);
}



			// 给 Obsidian 编辑器使用
			event.dataTransfer.setData(
				'text/plain',
				`#${tag}`,
			);

			// Markdown 编辑器也可以识别
			event.dataTransfer.setData(
				'text/markdown',
				`#${tag}`,
			);

			event.dataTransfer.effectAllowed =
				'copy';
		},
	);

	// 左键：搜索这个 Tag
	tagEl.onclick = (event: MouseEvent) => {
		if (
			Platform.isMobile &&
			Date.now() < suppressInteractionUntil
		) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		const app = this.app as App & {
			internalPlugins: {
				getPluginById(id: string): {
					instance?: {
						openGlobalSearch(query: string): void;
					};
				} | undefined;
			};
		};

		app.internalPlugins
			?.getPluginById('global-search')
			?.instance
			?.openGlobalSearch(
				`tag:#${tag}`,
			);
	};

	// 右键：打开分组菜单
	tagEl.oncontextmenu = (
		event: MouseEvent,
	) => {
		event.preventDefault();

		if (Platform.isMobile) {
			return;
		}

		this.showTagMenu(
			tag,
			event,
			sourceGroup,
		);
	};
}


private groupContainsTag(
	group: TagGroup,
	tag: string,
): boolean {
	return group.blocks.some((block) =>
		block.tags.includes(tag),
	);
}



private showTagMenu(
	tag: string,
	event: MouseEvent,
	currentGroup?: TagGroup,
) {
	const menu = new Menu();

	if (currentGroup) {
		menu.addItem((item) => {
			item
				.setTitle(this.t.removeFromGroup)
				.setIcon('circle-minus')
				.setDisabled(currentGroup.locked);

			if (!currentGroup.locked) {
				item.onClick(async () => {
					for (
						const block of currentGroup.blocks
					) {
						block.tags =
							block.tags.filter(
								(t) => t !== tag,
							);
					}

					await this.plugin.saveDataToDisk();

					this.render();

					new Notice(
						this.t.tagRemoved(
							tag,
							currentGroup.name,
						),
					);
				});
			}
		});

		menu.addSeparator();
	}

	menu.addItem((item) => {
		item
			.setTitle(this.t.renameTag)
			.setIcon('pencil')
			.onClick(() => this.renameTag(tag));
	});

	menu.addItem((item) => {
		item
			.setTitle(this.t.manageGroups)
			.setIcon('folders')
			.setDisabled(
				this.plugin.data.groups.length === 0,
			);

		const submenuItem = item as typeof item & {
			setSubmenu(): void;
			submenu: Menu;
		};

		submenuItem.setSubmenu();

		for (const group of this.plugin.data.groups) {
			const isMember = this.groupContainsTag(group, tag);

			submenuItem.submenu.addItem((subItem) => {
				subItem
					.setTitle(group.name)
					.setChecked(isMember);

				if (group.locked) {
					subItem
						.setIcon('lock')
						.setDisabled(true);
					return;
				}

				subItem.onClick(async () => {
					if (isMember) {
						for (const block of group.blocks) {
							block.tags = block.tags.filter(
								(itemTag) => itemTag !== tag,
							);
						}
					} else {
						const firstBlock = group.blocks[0];

						if (!firstBlock) {
							return;
						}

						firstBlock.tags.push(tag);
					}

					await this.plugin.saveDataToDisk();
					this.render();

					new Notice(
						isMember
							? this.t.tagRemoved(tag, group.name)
							: this.t.tagAdded(tag, group.name),
					);
				});
			});
		}
	});

	menu.showAtMouseEvent(event);
}


private renameGroup(group: TagGroup) {
	new RenameGroupModal(
		this.app,
		this.t,
		group.name,
		async (newName) => {
			const name = newName.trim();

			if (!name) {
				return;
			}

			if (name === group.name) {
				return;
			}

			const exists =
				this.plugin.data.groups.some(
					(other) =>
						other.id !== group.id &&
						other.name === name,
				);

			if (exists) {
				new Notice(
					this.t.groupAlreadyExists(name),
				);

				return;
			}

			group.name = name;

			await this.plugin.saveDataToDisk();

			this.render();
		},
	).open();
}

private showGroupMenu(
	group: TagGroup,
	event: MouseEvent,
) {
	const menu = new Menu();

	menu.addItem((item) => {
		item
			.setTitle(this.t.renameGroup)
			.setIcon('pencil')
			.setDisabled(group.locked)
			.onClick(() => this.renameGroup(group));
	});

	menu.addSeparator();

	menu.addItem((item) => {
		item
			.setTitle(this.t.deleteGroup)
			.setIcon('trash-2')
			.setWarning(true)
			.setDisabled(group.locked)
			.onClick(() => this.confirmDeleteGroup(group));
	});

	menu.showAtMouseEvent(event);
}



private confirmDeleteGroup(
	group: TagGroup,
) {
	new ConfirmDeleteGroupModal(
		this.app,
		this.t,
		group.name,
		async () => {
			this.plugin.data.groups =
				this.plugin.data.groups.filter(
					(other) => other.id !== group.id,
				);

			await this.plugin.saveDataToDisk();
			this.render();

			new Notice(
				this.t.groupDeleted(group.name),
			);
		},
	).open();
}

private renameTag(oldTag: string) {
	new RenameTagModal(
		this.app,
		this.t,
		oldTag,
		async (newTag) => {
			await this.performTagRename(
				oldTag,
				newTag,
			);
		},
	).open();
}

private async performTagRename(
	oldTag: string,
	newTag: string,
) {
	// 去掉用户可能输入的 #
	oldTag = oldTag.replace(/^#/, '').trim();
	newTag = newTag.replace(/^#/, '').trim();

	if (!newTag) {
		return;
	}

	if (oldTag === newTag) {
		return;
	}

	// Tag 本身不能包含空格等非法情况。
	// 这里先做最基础的检查。
	if (
		newTag.includes(' ') ||
		newTag.includes('\t') ||
		newTag.includes('\n') ||
		newTag.includes('\r')
	) {
		new Notice(
			this.t.invalidTagName,
		);

		return;
	}

	const allFiles =
		this.app.vault.getMarkdownFiles();

	const changedFiles = new Set<string>();

	for (const file of allFiles) {
		const cache =
			this.app.metadataCache.getFileCache(
				file,
			);

		if (!cache?.tags) {
			continue;
		}

		// 找出这个文件里所有真正的旧 Tag
		const matchingTags =
			cache.tags.filter(
				(tag) =>
					tag.tag.replace(/^#/, '') ===
					oldTag,
			);

		if (matchingTags.length === 0) {
			continue;
		}

		let content =
			await this.app.vault.read(file);

		// 从后往前替换，避免前面的替换影响位置
		const replacements =
			matchingTags
				.map((tag) => ({
					start: tag.position.start.offset,
					end: tag.position.end.offset,
				}))
				.sort(
					(a, b) =>
						b.start - a.start,
				);

		for (const replacement of replacements) {
			const original =
				content.slice(
					replacement.start,
					replacement.end,
				);

			// 保留 #，只替换 Tag 名称
			const prefix =
				original.startsWith('#')
					? '#'
					: '';

			content =
				content.slice(
					0,
					replacement.start,
				) +
				prefix +
				newTag +
				content.slice(
					replacement.end,
				);
		}

		await this.app.vault.modify(
			file,
			content,
		);

		changedFiles.add(file.path);
	}


// 修改 YAML / Frontmatter 中的 Tag
for (const file of allFiles) {
	const cache =
		this.app.metadataCache.getFileCache(file);

	if (!cache?.frontmatter) {
		continue;
	}

	const frontmatter =
		cache.frontmatter;

	// Obsidian 通常会把 YAML tags 解析成 tags 数组
	if (!Array.isArray(frontmatter.tags)) {
		continue;
	}

	const tags =
		frontmatter.tags as unknown[];

	const hasOldTag = tags.some(
		(value) =>
			String(value).replace(/^#/, '') ===
			oldTag,
	);

	if (!hasOldTag) {
		continue;
	}

	await this.app.fileManager.processFrontMatter(
		file,
		(frontmatter: Record<string, unknown>) => {
			const tags = frontmatter.tags;

			if (!Array.isArray(tags)) {
				return;
			}

			frontmatter.tags =
				tags.map(
					(value: unknown) => {
						const normalized =
							String(value)
								.replace(/^#/, '');

						return normalized === oldTag
							? newTag
							: value;
					},
				);
		},
	);

	changedFiles.add(file.path);
}



	// 更新我们自己的分组数据

for (const group of this.plugin.data.groups) {
	const seen = new Set<string>();

	for (const block of group.blocks) {
		const newTags: string[] = [];

		for (const tag of block.tags) {
			const renamedTag =
			tag === oldTag
				? newTag
				: tag;

		// 防止重命名后产生重复 Tag
		if (!seen.has(renamedTag)) {
			seen.add(renamedTag);
			newTags.push(
				renamedTag,
			);
		}
	}

	block.tags = newTags;
}
}



	await this.plugin.saveDataToDisk();

	this.render();

	new Notice(
		this.t.tagRenamed(
			oldTag,
			newTag,
			changedFiles.size,
		),
	);
}



	/* 创建新分组 */
	private createGroup() {
	new CreateGroupModal(this.app, this.t, async (name) => {
		this.plugin.data.groups.push({
			id: crypto.randomUUID(),
			name: name.trim(),
			blocks: [ { id: crypto.randomUUID(), tags: [], }, ],
			collapsed: false,
			locked: false,
		});

		await this.plugin.saveDataToDisk();

		this.render();

		new Notice(this.t.groupCreated(name.trim()));
	}).open();
}

	/*搜索过滤*/
	private filterTags(
		container: HTMLElement,
		query: string,
	) {
		const tags =
			container.querySelectorAll<HTMLElement>(
				'.tag-manager-tag',
			);

		for (const tag of Array.from(tags)) {
			const text =
				tag.textContent
					?.toLowerCase() ?? '';

			tag.style.display =
				!query ||
				text.includes(query)
					? ''
					: 'none';
		}
	}
}

class ConfirmDeleteGroupModal extends Modal {
	private t: Language;
	private groupName: string;
	private onConfirm: () => void | Promise<void>;

	constructor(
		app: App,
		t: Language,
		groupName: string,
		onConfirm: () => void | Promise<void>,
	) {
		super(app);
		this.t = t;
		this.groupName = groupName;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl('h2', {
			text: this.t.deleteGroup,
		});
		contentEl.createEl('p', {
			text: this.t.confirmDeleteGroup(this.groupName),
			cls: 'tag-manager-modal-message',
		});

		const buttons = contentEl.createDiv({
			cls: 'tag-manager-modal-actions',
		});

		buttons.createEl('button', {
			text: this.t.cancel,
		}).onclick = () => this.close();

		buttons.createEl('button', {
			text: this.t.deleteGroup,
			cls: 'mod-warning',
		}).onclick = () => {
			void this.onConfirm();
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}

class CreateGroupModal extends Modal {
	private t: Language;
	private onSubmit: (name: string) => void | Promise<void>;

	constructor(
		app: App,
		t: Language,
		onSubmit: (name: string) => void | Promise<void>,
	) {
		super(app);
		this.t = t;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl('h2', {
			text: this.t.createGroupTitle,
		});

		const input = contentEl.createEl('input', {
			type: 'text',
			placeholder: this.t.groupNamePlaceholder,
			cls: 'tag-manager-modal-input',
		});

		const buttonContainer =
			contentEl.createDiv({
				cls: 'tag-manager-modal-actions',
			});

		const cancelButton =
			buttonContainer.createEl('button', {
				text: this.t.cancel,
			});

		cancelButton.onclick = () => {
			this.close();
		};

		const createButton =
			buttonContainer.createEl('button', {
				text: this.t.create,
				cls: 'mod-cta',
			});

		const submit = () => {
			const name = input.value.trim();

			if (!name) {
				return;
			}

			void this.onSubmit(name);
			this.close();
		};

		createButton.onclick = submit;

		input.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				submit();
			}
		});

		input.focus();
	}

	onClose() {
		this.contentEl.empty();
	}
}


class RenameTagModal extends Modal {
	private t: Language;
	private oldTag: string;
	private onSubmit: (newTag: string) => void | Promise<void>;

	constructor(
		app: App,
		t: Language,
		oldTag: string,
		onSubmit: (newTag: string) => void | Promise<void>,
	) {
		super(app);

		this.t = t;
		this.oldTag = oldTag;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl('h2', {
			text: this.t.renameTagTitle,
		});

		contentEl.createEl('p', {
			text: this.t.renameTagPrompt(this.oldTag),
		});

		const input = contentEl.createEl(
			'input',
			{
				type: 'text',
				placeholder: this.t.newTagNamePlaceholder,
				cls: 'tag-manager-modal-input',
			},
		);

		input.value = this.oldTag;

		const buttonContainer =
			contentEl.createDiv({
				cls: 'tag-manager-modal-actions',
			});

		const cancelButton =
			buttonContainer.createEl(
				'button',
				{
					text: this.t.cancel,
				},
			);

		cancelButton.onclick = () => {
			this.close();
		};

		const renameButton =
			buttonContainer.createEl(
				'button',
				{
					text: this.t.rename,
					cls: 'mod-cta',
				},
			);

		const submit = () => {
			const newTag =
				input.value.trim();

			if (!newTag) {
				return;
			}

			void this.onSubmit(newTag);
			this.close();
		};

		renameButton.onclick = submit;

		input.addEventListener(
			'keydown',
			(event) => {
				if (event.key === 'Enter') {
					submit();
				}
			},
		);

		input.focus();
		input.select();
	}

	onClose() {
		this.contentEl.empty();
	}
}


class RenameGroupModal extends Modal {
	private t: Language;
	private oldName: string;
	private onSubmit: (name: string) => void | Promise<void>;

	constructor(
		app: App,
		t: Language,
		oldName: string,
		onSubmit: (name: string) => void | Promise<void>,
	) {
		super(app);

		this.t = t;
		this.oldName = oldName;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl('h2', {
			text: this.t.renameGroupTitle,
		});

		const input = contentEl.createEl(
			'input',
			{
				type: 'text',
				placeholder: this.t.groupNamePlaceholder,
				cls: 'tag-manager-modal-input',
			},
		);

		input.value = this.oldName;

		const buttons =
			contentEl.createDiv({
				cls: 'tag-manager-modal-actions',
			});

		const cancel =
			buttons.createEl('button', {
				text: this.t.cancel,
			});

		cancel.onclick = () => {
			this.close();
		};

		const rename =
			buttons.createEl('button', {
				text: this.t.rename,
				cls: 'mod-cta',
			});

		const submit = () => {
			const name =
				input.value.trim();

			if (!name) {
				return;
			}

			void this.onSubmit(name);
			this.close();
		};

		rename.onclick = submit;

		input.addEventListener(
			'keydown',
			(event) => {
				if (event.key === 'Enter') {
					submit();
				}
			},
		);

		input.focus();
		input.select();
	}

	onClose() {
		this.contentEl.empty();
	}
}

import fs from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { getPaths } from "../../lib/constants";
import { getAvailableInstances } from "../../lib/instance-discovery";
import type { Logger } from "@caporal/core";

export interface CleanupTagsOptions {
	minCount?: number;
	dryRun?: boolean;
}

interface TagStats {
	totalTags: number;
	validTags: number;
	removedTags: number;
	filesModified: number;
	itemsModified: number;
}

interface FileTagData {
	filePath: string;
	fileName: string;
	doc: Record<string, unknown>;
	originalContent: string;
}

/**
 * Cleanup tags in YAML files for an instance
 * Removes tags that appear less than minCount times across all items
 */
export async function cleanupTags(
	instance: string,
	options: CleanupTagsOptions,
	_logger: Logger,
): Promise<TagStats> {
	const paths = getPaths();
	const minTagCount = options.minCount ?? 4;
	const dryRun = options.dryRun ?? false;

	// Validate instance exists
	const availableInstances = getAvailableInstances();
	if (!availableInstances.includes(instance)) {
		throw new Error(
			`Instance "${instance}" not found. Available instances: ${availableInstances.join(", ")}`,
		);
	}

	const yamlDir = join(paths.INSTANCES_BASE, instance, "yaml");
	if (!fs.existsSync(yamlDir)) {
		throw new Error(`YAML directory not found: ${yamlDir}`);
	}

	// Track all tags and their usage
	const tagCounts = new Map<string, number>();
	const fileTagData: FileTagData[] = [];

	// Read and parse all YAML files
	const files = fs
		.readdirSync(yamlDir)
		.filter((f) => f.endsWith(".yml"))
		.map((f) => join(yamlDir, f));

	console.log(`Found ${files.length} YAML files to process in ${instance}\n`);

	// First pass: collect all tags and count them
	for (const filePath of files) {
		const content = fs.readFileSync(filePath, "utf8");
		let doc: Record<string, unknown>;

		try {
			doc = yaml.load(content) as Record<string, unknown>;
		} catch (e) {
			const error = e as Error;
			console.error(`Error parsing ${filePath}: ${error.message}`);
			continue;
		}

		if (!doc || !doc.rows) continue;

		const rows = doc.rows as Array<{ row?: { props?: { tags?: string[] } } }>;
		for (const row of rows) {
			if (!row || !row.row) continue;

			const item = row.row;
			const tags = item?.props?.tags;

			if (Array.isArray(tags)) {
				// Count each tag
				for (const tag of tags) {
					tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
				}
			}
		}

		fileTagData.push({
			filePath,
			fileName: filePath.split("/").pop() || filePath,
			doc,
			originalContent: content,
		});
	}

	// Filter tags that meet the minimum count requirement
	const validTags = new Set<string>();
	for (const [tag, count] of tagCounts.entries()) {
		if (count >= minTagCount) {
			validTags.add(tag);
		}
	}

	console.log("Tag Usage Summary:");
	console.log("==================\n");

	// Sort tags by count (descending)
	const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

	for (const [tag, count] of sortedTags) {
		const status = validTags.has(tag) ? "✓ KEEP" : "✗ REMOVE";
		console.log(`${status.padEnd(10)} ${tag.padEnd(30)} (${count} items)`);
	}

	console.log(`\nTotal tags: ${tagCounts.size}`);
	console.log(`Tags to keep (≥${minTagCount} items): ${validTags.size}`);
	console.log(`Tags to remove: ${tagCounts.size - validTags.size}\n`);

	if (dryRun) {
		console.log("Dry run mode - no files will be modified\n");
	}

	// Second pass: update files with filtered tags
	let totalFilesModified = 0;
	let totalItemsModified = 0;

	for (const { filePath, fileName, doc } of fileTagData) {
		let modified = false;
		let itemsModified = 0;

		const rows = doc.rows as Array<{ row?: { props?: { tags?: string[] } } }>;

		// Process each item and filter its tags
		for (const row of rows) {
			if (!row || !row.row) continue;

			const item = row.row;
			if (!item.props || !item.props.tags) continue;

			const originalTags = item.props.tags;
			const filteredTags = originalTags.filter((tag) => validTags.has(tag));

			if (filteredTags.length !== originalTags.length) {
				itemsModified++;

				if (!dryRun) {
					if (filteredTags.length > 0) {
						item.props.tags = filteredTags;
					} else {
						delete item.props.tags;
					}
				}
				modified = true;
			}
		}

		if (modified) {
			if (!dryRun) {
				// Write back with YAML formatting that preserves structure
				const newContent = yaml.dump(doc, {
					indent: 3,
					lineWidth: -1,
					quotingType: '"',
					forceQuotes: false,
					noRefs: true,
					sortKeys: false,
					flowLevel: -1,
					styles: {
						"!!null": "canonical",
					},
				});

				fs.writeFileSync(filePath, newContent, "utf8");
			}
			totalFilesModified++;
			totalItemsModified += itemsModified;
			console.log(
				`${dryRun ? "[DRY RUN] Would modify" : "Modified"} ${fileName}: ${itemsModified} items updated`,
			);
		}
	}

	console.log("\n=== Summary ===");
	console.log(`Files ${dryRun ? "that would be " : ""}modified: ${totalFilesModified}`);
	console.log(`Items with tags ${dryRun ? "that would be " : ""}removed: ${totalItemsModified}`);

	return {
		totalTags: tagCounts.size,
		validTags: validTags.size,
		removedTags: tagCounts.size - validTags.size,
		filesModified: totalFilesModified,
		itemsModified: totalItemsModified,
	};
}

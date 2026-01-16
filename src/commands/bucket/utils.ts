import { readdirSync, statSync } from "fs";
import { join } from "path";

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
	const files = readdirSync(dirPath);

	files.forEach((file) => {
		// Skip .DS_Store and other hidden system files
		if (file === ".DS_Store" || file.startsWith("._")) {
			return;
		}

		const filePath = join(dirPath, file);
		if (statSync(filePath).isDirectory()) {
			arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
		} else {
			arrayOfFiles.push(filePath);
		}
	});

	return arrayOfFiles;
}

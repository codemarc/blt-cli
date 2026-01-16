import type { Program } from "@caporal/core";
import { imageConvertCommand } from "./image/convert";
import { imageColorCommand } from "./image/color";
import { imageEnhanceCommand } from "./image/enhance";
import { imageSharpenCommand } from "./image/sharpen";

export default function imageCommand(program: Program) {
	// Main image command - shows help when no operation is specified
	const imageHelpText = `
image manipulation utilities

Usage:
  blt image <operation>

Available operations:
  convert     Convert images to WebP format
  color       Manipulate or convert color profiles
  enhance     Enhance image features
  sharpen     Sharpen images

Run 'blt image <operation> --help' for more information on a specific command.
`;

	program
		.command("image", "image manipulation")
		.help(imageHelpText)
		.action(() => {
			console.log(imageHelpText);
		});

	// Convert image to WebP
	program
		.command("image convert", "Convert image(s) to WebP format")
		.hide()
		.argument("<input>", "Input file or directory")
		.option("-o, --output <path>", "Output file or directory", {
			default: "",
		})
		.option("-q, --quality <quality>", "WebP quality (0-100)", {
			default: 80,
			validator: program.NUMBER,
		})
		.option("-r, --recursive", "Process directories recursively", {
			default: false,
		})
		.option("--overwrite", "Overwrite existing files", {
			default: false,
		})
		.action(async ({ args, options, logger }) => {
			await imageConvertCommand(args, options, logger);
		});

	// Change base color of image
	program
		.command("image color", "Change the base color of an image")
		.hide()
		.argument("<input>", "Input image file path")
		.option("-t, --to <color>", "Target color (hex, rgb, or color name)", {
			default: "",
		})
		.option("-f, --from <color>", "Source color to replace (hex, rgb, or color name). If not specified, detects dominant color", {
			default: "",
		})
		.option("-o, --output <path>", "Output file path (defaults to overwriting input)", {
			default: "",
		})
		.option("-q, --quality <quality>", "WebP quality (0-100)", {
			default: 90,
			validator: program.NUMBER,
		})
		.option("-z, --tolerance <tolerance>", "Color matching tolerance (0-100, default: 30)", {
			default: 30,
			validator: program.NUMBER,
		})
		.action(async ({ args, options, logger }) => {
			await imageColorCommand(args, options, logger);
		});

	// Enhance avatar image for dark or light mode
	program
		.command("image enhance", "Enhance avatar image for dark or light mode")
		.hide()
		.argument("<input>", "Input image file path")
		.option("-m, --mode <mode>", "Enhancement mode: dark or light", {
			default: "dark",
			validator: ["dark", "light"],
		})
		.option("-o, --output <path>", "Output file path (defaults to overwriting input)", {
			default: "",
		})
		.option("-q, --quality <quality>", "WebP quality (0-100)", {
			default: 90,
			validator: program.NUMBER,
		})
		.action(async ({ args, options, logger }) => {
			await imageEnhanceCommand(args, options, logger);
		});

	// Sharpen image edges
	program
		.command("image sharpen", "Sharpen image edges")
		.hide()
		.argument("<input>", "Input file or directory")
		.option("-o, --output <path>", "Output file or directory", {
			default: "",
		})
		.option("-s, --sigma <sigma>", "Sigma value for sharpening (0.3-1000, default: 1.0)", {
			default: 1.0,
			validator: program.NUMBER,
		})
		.option("-f, --flat <flat>", "Flat threshold (0-10000, default: 1.0)", {
			default: 1.0,
			validator: program.NUMBER,
		})
		.option("-j, --jagged <jagged>", "Jagged threshold (0-10000, default: 2.0)", {
			default: 2.0,
			validator: program.NUMBER,
		})
		.option("-r, --recursive", "Process directories recursively", {
			default: false,
		})
		.option("--overwrite", "Overwrite existing files", {
			default: false,
		})
		.action(async ({ args, options, logger }) => {
			await imageSharpenCommand(args, options, logger);
		});
}

import type { Program } from "@caporal/core";
import { pdfBinderCommand } from "./pdf/binder";
import { pdfFolioCommand } from "./pdf/folio";

export default function pdfCommand(program: Program) {
	// Main PDF command - shows help when no operation is specified
	const pdfHelpText = `
PDF manipulation utilities

Usage:
  blt pdf <operation>

Available operations:
  binder      Combine multiple PDFs into a single file
  folio       Create a folio with page numbers and table of contents

Run 'blt pdf <operation> --help' for more information on a specific command.
`;

	program
		.command("pdf", "PDF manipulation")
		.help(pdfHelpText)
		.action(() => {
			console.log(pdfHelpText);
		});

	// Binder - combine PDFs
	program
		.command("pdf binder", "Combine multiple PDFs into a single file")
		.hide()
		.argument("<output>", "Output PDF filename")
		.argument("[inputs...]", "Input files or directories (can be mixed)")
		.option("-r, --recursive", "Process directories recursively", {
			default: false,
		})
		.option("--overwrite", "Overwrite existing output file", {
			default: false,
		})
		.action(async ({ args, options, logger }) => {
			await pdfBinderCommand(args, options, logger);
		});

	// Folio - create folio with page numbers and TOC
	program
		.command("pdf folio", "Create a folio with page numbers and table of contents")
		.hide()
		.argument("<output>", "Output PDF filename")
		.argument("[inputs...]", "Input files or directories (can be mixed)")
		.option("-r, --recursive", "Process directories recursively", {
			default: false,
		})
		.option("--overwrite", "Overwrite existing output file", {
			default: false,
		})
		.option("--no-toc", "Skip table of contents generation", {
			default: false,
		})
		.option("--start-page <number>", "Starting page number", {
			default: 1,
			validator: program.NUMBER,
		})
		.action(async ({ args, options, logger }) => {
			await pdfFolioCommand(args, options, logger);
		});
}

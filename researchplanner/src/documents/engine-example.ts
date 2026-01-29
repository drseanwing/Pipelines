/**
 * Example usage of DocumentGenerator
 * 
 * This demonstrates how to use the document engine core.
 */

import { DocumentGenerator } from './engine.js';
import { Document, Paragraph, TextRun } from 'docx';

async function example() {
  // Create a document generator for a project
  const generator = new DocumentGenerator('PROJECT-001', '1.0');

  // Create metadata
  const metadata = generator.createMetadata('protocol', 'Dr. Smith');
  console.log('Metadata:', metadata);

  // Get default styles
  const styles = generator.getDocumentStyles();
  console.log('Styles configured');

  // Get page properties
  const pageProps = generator.getPageProperties();
  console.log('Page properties configured');

  // Create a simple document
  const doc = new Document({
    styles: styles,
    sections: [
      {
        ...pageProps,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sample Document',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'This is a test document generated using the DocumentGenerator class.',
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Generate document buffer
  const buffer = await generator.generateDocument(doc);
  console.log('Generated document buffer, size:', buffer.length, 'bytes');

  // Save document
  const filePath = await generator.saveDocument(buffer, 'example-v1.0.docx');
  console.log('Document saved to:', filePath);
}

// Uncomment to run:
// example().catch(console.error);

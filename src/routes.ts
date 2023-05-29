import { Router } from 'express';
import { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import fs from 'node:fs';

import { prismaClient } from './databases/prismaClient';
import PdfPrinter from 'pdfmake';

const routes = Router();

routes.post('/products',async (request, response) => {
  const {
    description,
    price,
    quantity
  } = request.body;

  const products = await prismaClient.products.create({
    data: {
      description,
      price,
      quantity,
    },
  });

  return response.json(products);

});


routes.get('/products', async (request, response) => {
  const products = await prismaClient.products.findMany();

  return response.json(products);
});

routes.get('/products/report', async (request, response) => {
  const products = await prismaClient.products.findMany();

  const fonts = {
    Times: {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic'
    },
  }

  const printer = new PdfPrinter(fonts);

  const body = [];

  const columnsTitle: TableCell[] = [
    { text: 'ID', style: 'columnsTitle' },
    { text: 'Descrição', style: 'columnsTitle' },
    { text: 'Preço', style: 'columnsTitle' },
    { text: 'Quantidade', style: 'columnsTitle' },
  ];

  const columnsBody = new Array();

  columnsTitle.forEach(column => columnsBody.push(column));

  body.push(columnsBody);

  for await (let product of products) {
    const rows = new Array();

    rows.push(product.id);
    rows.push(product.description);
    rows.push(`R$${product.price}`);
    rows.push(product.quantity);

    body.push(rows);
  }

  const docDefinitions: TDocumentDefinitions = {
    defaultStyle: { font: 'Times' },
    content: [
      {
        columns: [
          { text: 'Relatório de produtos', style: 'header' },
          { text: '29/05/2023\n\n', style: 'header' }
        ]
      },
      {
        table: {
          heights: function (row) {
            return 30;
          },
          widths: [250, 'auto', 60, 'auto'],
          body,
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
      },
      columnsTitle: {
        fontSize: 12,
        bold: true,
        fillColor: '#7159c1',
        color: '#FFF',
      },
    },
  }

  const pdfDoc = printer.createPdfKitDocument(docDefinitions);

  const chunks: any = [];

  pdfDoc.on('data', chunk => {
    chunks.push(chunk);
  });

  pdfDoc.end();

  pdfDoc.on('end', () => {
    const result = Buffer.concat(chunks);
    return response.end(result);
  });
});

export { routes }

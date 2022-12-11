import { APIGatewayProxyHandler } from "aws-lambda";
import { compile } from "handlebars";
import { document } from "../utils/dynamodbClient";
import { join } from "path";
import { readFileSync } from "fs";
import dayjs from "dayjs";
import chromium from "chrome-aws-lambda";
import { S3 } from "aws-sdk";

interface IcreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface Itemplate {
  id: string;
  name: string;
  date: string;
  medal: string;
  grade: string;
}

const compileTemplate = async (data: Itemplate) => {
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs");

  const html = readFileSync(filePath, "utf-8");

  return compile(html)(data);
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as IcreateCertificate;

  const response = await document
    .query({
      TableName: "users_certificates",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  const userAlreadyExists = response.Items[0];

  userAlreadyExists
    ? await document
        .put({
          TableName: "users_certificates",
          Item: {
            id,
            name,
            grade,
            created_at: new Date().getTime(),
          },
        })
        .promise()
    : {
        statusCode: 409,
        message: "User already exists",
      };

  const medalPath = join(process.cwd(), "src", "templates", "selo.png");

  const medal = readFileSync(medalPath, "base64");

  const data: Itemplate = {
    date: dayjs().format("DD/MM/YYYY"),
    grade,
    id,
    name,
    medal: medal,
  };

  const content = await compileTemplate(data);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  });

  const page = await browser.newPage();

  await page.setContent(content);

  const pdf = await page.pdf({
    format: "a4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
  });

  await browser.close();

  const s3 = new S3();

  s3.putObject({
    Bucket: "bucket-certificate-ignite-serverless-rocketseat",
    Key: `${id}.pdf`,
    ACL: "public-read",
    Body: pdf,
    ContentType: "application/pdf",
  }).promise();

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Certificado emitido com sucesso!",
      url: `https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${id}.pdf`,
    }),
  };
};
